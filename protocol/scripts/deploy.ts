import hre from "hardhat";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress, keccak256, type Address, type Hex } from "viem";
import { getDeployConfig } from "./config.js";
import { deployCreate2Contract, ensureCreateXFactory, resolveGOTSalt } from "./create2.js";

const DEPLOYMENTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../deployments");

function deploymentKey(chainKey: string, networkName: string): string {
  if (networkName === "baseFork") return "base-fork";
  if (networkName === "baseForkTip") return "base-fork-tip";
  return chainKey;
}

type DeploymentResult = {
  chainId: number;
  chainKey: string;
  network: string;
  deployer: Address;
  create2Salt: Hex;
  create2GuardedSalt: Hex;
  constructorArguments: {
    treasury: Address;
    gotNameClaimVerifier: Address;
    executionShareBps: number;
    partnerShareBps: number;
    maxFeeBps: number;
  };
  dependencies: {
    usdc: Address;
    spendPermissionManager: Address;
  };
  contracts: {
    gotIntent: Address;
    gotFactory: Address;
    gotName: Address;
    gotSubscription: Address;
  };
  creationCodeHashes: {
    gotIntent: Hex;
    gotFactory: Hex;
  };
  runtimeCodeHashes: {
    gotIntent: Hex;
    gotFactory: Hex;
    gotName: Hex;
    gotSubscription: Hex;
  };
};

async function readDeploymentFile(file: string): Promise<Partial<DeploymentResult> | undefined> {
  try {
    const raw = await readFile(file, "utf8");
    if (raw.trim() === "") {
      return undefined;
    }
    return JSON.parse(raw) as Partial<DeploymentResult>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function reusableCreate2Salt(
  deployment: Partial<DeploymentResult> | undefined,
  config: {
    treasury: Address;
    gotNameClaimVerifier: Address;
    usdc: Address;
    spendPermissionManager: Address;
    executionShareBps: number;
    partnerShareBps: number;
    maxFeeBps: number;
  },
): Hex | undefined {
  const args = deployment?.constructorArguments;
  if (
    deployment?.create2Salt === undefined ||
    !/^0x[0-9a-fA-F]{64}$/.test(deployment.create2Salt) ||
    args === undefined ||
    args.treasury === undefined ||
    args.gotNameClaimVerifier === undefined ||
    !isAddress(args.treasury) ||
    !isAddress(args.gotNameClaimVerifier) ||
    getAddress(args.treasury) !== getAddress(config.treasury) ||
    getAddress(args.gotNameClaimVerifier) !== getAddress(config.gotNameClaimVerifier) ||
    args.executionShareBps !== config.executionShareBps ||
    args.partnerShareBps !== config.partnerShareBps ||
    args.maxFeeBps !== config.maxFeeBps ||
    deployment.dependencies === undefined ||
    deployment.dependencies.usdc === undefined ||
    deployment.dependencies.spendPermissionManager === undefined ||
    !isAddress(deployment.dependencies.usdc) ||
    !isAddress(deployment.dependencies.spendPermissionManager) ||
    getAddress(deployment.dependencies.usdc) !== getAddress(config.usdc) ||
    getAddress(deployment.dependencies.spendPermissionManager) !== getAddress(config.spendPermissionManager)
  ) {
    return undefined;
  }
  return deployment.create2Salt;
}

async function hasCode(
  publicClient: { getCode: (args: { address: Address }) => Promise<Hex | undefined> },
  address: Address,
): Promise<boolean> {
  const code = await publicClient.getCode({ address });
  return code !== undefined && code !== "0x";
}

async function requireCode(
  publicClient: { getCode: (args: { address: Address }) => Promise<Hex | undefined> },
  address: Address,
  label: string,
): Promise<Hex> {
  const code = await publicClient.getCode({ address });
  if (code === undefined || code === "0x") {
    throw new Error(`${label} has no code at ${address}`);
  }
  return code;
}

async function verifyDependency(
  publicClient: { getCode: (args: { address: Address }) => Promise<Hex | undefined> },
  label: string,
  address: Address,
  expectedCodeHash: Hex,
): Promise<void> {
  const code = await requireCode(publicClient, address, label);
  const actualCodeHash = keccak256(code);
  if (actualCodeHash !== expectedCodeHash) {
    throw new Error(`Unexpected ${label} runtime code hash ${actualCodeHash} at ${address}`);
  }
}

async function reuseOrDeployCreate2({
  label,
  expectedAddress,
  deploy,
  publicClient,
}: {
  label: string;
  expectedAddress: Address;
  deploy: () => Promise<Address>;
  publicClient: { getCode: (args: { address: Address }) => Promise<Hex | undefined> };
}): Promise<Address> {
  if (await hasCode(publicClient, expectedAddress)) {
    console.log(`${label}: ${expectedAddress} (reused)`);
    return expectedAddress;
  }

  const deployedAddress = await deploy();
  if (deployedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(`Unexpected ${label} address ${deployedAddress}; expected ${expectedAddress}`);
  }
  await requireCode(publicClient, deployedAddress, label);
  console.log(`${label}: ${deployedAddress}`);
  return deployedAddress;
}

async function reuseOrDeploy({
  label,
  existingAddress,
  deploy,
  publicClient,
}: {
  label: string;
  existingAddress: Address | undefined;
  deploy: () => Promise<{ address: Address }>;
  publicClient: { getCode: (args: { address: Address }) => Promise<Hex | undefined> };
}): Promise<Address> {
  if (existingAddress !== undefined && (await hasCode(publicClient, existingAddress))) {
    console.log(`${label}: ${existingAddress} (reused)`);
    return existingAddress;
  }

  const deployed = await deploy();
  await requireCode(publicClient, deployed.address, label);
  console.log(`${label}: ${deployed.address}`);
  return deployed.address;
}

function assertAddress(label: string, actual: Address, expected: Address): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new Error(`Unexpected ${label} ${actual}; expected ${expected}`);
  }
}

function assertNumber(label: string, actual: number | bigint, expected: number): void {
  if (BigInt(actual) !== BigInt(expected)) {
    throw new Error(`Unexpected ${label} ${actual}; expected ${expected}`);
  }
}

async function main() {
  const connection = await hre.network.connect();
  try {
    const { viem, networkName } = connection;
    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();
    if (deployer === undefined) {
      throw new Error(`No wallet client configured for network ${networkName}`);
    }

    const chainId = await publicClient.getChainId();
    const isLocalFork = networkName === "baseFork" || networkName === "baseForkTip";
    const config = getDeployConfig({ chainId, networkName });
    const deploymentFile = path.join(DEPLOYMENTS_DIR, `${deploymentKey(config.key, networkName)}.json`);
    const existingDeployment = await readDeploymentFile(deploymentFile);
    const baseDeployment = await readDeploymentFile(path.join(DEPLOYMENTS_DIR, "base.json"));
    const savedCreate2Salt = reusableCreate2Salt(baseDeployment, config);

    if (!isLocalFork && config.create2Salt === undefined && savedCreate2Salt === undefined) {
      throw new Error(
        "deployments/base.json has no CREATE2 salt matching the configured constructor arguments. Mine it with deploy:baseFork, then copy the salt and constructor values into base.json.",
      );
    }

    console.log(`Deploying GOT protocol to ${networkName}`);
    console.log(`Chain config: ${config.key} (${chainId})`);
    console.log(`Deployer: ${deployer.account.address}`);
    console.log(`Treasury: ${config.treasury}`);
    console.log(`GOTName claim verifier: ${config.gotNameClaimVerifier}`);
    if (config.create2Salt !== undefined || savedCreate2Salt !== undefined) {
      console.log(`Reusing Base CREATE2 salt: ${config.create2Salt ?? savedCreate2Salt}`);
    }

    await verifyDependency(publicClient, "Base USDC", config.usdc, config.usdcCodeHash);
    await verifyDependency(
      publicClient,
      "Spend Permission Manager",
      config.spendPermissionManager,
      config.spendPermissionManagerCodeHash,
    );
    await ensureCreateXFactory(publicClient);

    const create2 = await resolveGOTSalt({
      artifacts: hre.artifacts,
      deployer: deployer.account.address,
      treasury: config.treasury,
      executionShareBps: config.executionShareBps,
      partnerShareBps: config.partnerShareBps,
      maxFeeBps: config.maxFeeBps,
      requestedSalt: config.create2Salt ?? savedCreate2Salt,
      vanityPrefix: config.factoryVanityPrefix,
      vanitySearchLimit: config.factoryVanitySearchLimit,
      vanityNamespace: config.create2SaltNamespace,
    });

    console.log(`CREATE2 raw salt: ${create2.rawSalt}`);
    console.log(`CREATE2 guarded salt: ${create2.guardedSalt}`);
    console.log(`Predicted GOTIntent: ${create2.gotIntent}`);
    console.log(`Predicted GOTFactory: ${create2.gotFactory}`);

    const gotIntentAddress = await reuseOrDeployCreate2({
      label: "GOTIntent",
      expectedAddress: create2.gotIntent,
      deploy: () =>
        deployCreate2Contract({
          publicClient,
          walletClient: deployer,
          salt: create2.rawSalt,
          bytecode: create2.gotIntentBytecode,
          confirmations: config.confirmations,
        }),
      publicClient,
    });

    const gotFactoryAddress = await reuseOrDeployCreate2({
      label: "GOTFactory",
      expectedAddress: create2.gotFactory,
      deploy: () =>
        deployCreate2Contract({
          publicClient,
          walletClient: deployer,
          salt: create2.rawSalt,
          bytecode: create2.gotFactoryBytecode,
          confirmations: config.confirmations,
        }),
      publicClient,
    });

    const gotNameAddress = await reuseOrDeploy({
      label: "GOTName",
      existingAddress: existingDeployment?.contracts?.gotName,
      deploy: () =>
        viem.deployContract("GOTName", [config.gotNameClaimVerifier], { confirmations: config.confirmations }),
      publicClient,
    });
    const gotSubscriptionAddress = await reuseOrDeploy({
      label: "GOTSubscription",
      existingAddress: existingDeployment?.contracts?.gotSubscription,
      deploy: () =>
        viem.deployContract("GOTSubscription", [gotFactoryAddress, config.spendPermissionManager], {
          confirmations: config.confirmations,
        }),
      publicClient,
    });

    const gotIntent = await viem.getContractAt("GOTIntent", gotIntentAddress);
    assertAddress("GOTIntent treasury", await gotIntent.read.TREASURY(), config.treasury);
    assertNumber("GOTIntent execution share", await gotIntent.read.EXECUTION_SHARE_BPS(), config.executionShareBps);
    assertNumber("GOTIntent partner share", await gotIntent.read.PARTNER_SHARE_BPS(), config.partnerShareBps);

    const gotFactory = await viem.getContractAt("GOTFactory", gotFactoryAddress);
    assertAddress("GOTFactory implementation", await gotFactory.read.IMPLEMENTATION(), gotIntentAddress);
    assertAddress("GOTFactory treasury", await gotFactory.read.TREASURY(), config.treasury);
    assertNumber("GOTFactory execution share", await gotFactory.read.EXECUTION_SHARE_BPS(), config.executionShareBps);
    assertNumber("GOTFactory partner share", await gotFactory.read.PARTNER_SHARE_BPS(), config.partnerShareBps);
    assertNumber("GOTFactory max fee", await gotFactory.read.MAX_FEE_BPS(), config.maxFeeBps);

    const gotName = await viem.getContractAt("GOTName", gotNameAddress);
    assertAddress("GOTName claim verifier", await gotName.read.CLAIM_VERIFIER(), config.gotNameClaimVerifier);

    const gotSubscription = await viem.getContractAt("GOTSubscription", gotSubscriptionAddress);
    assertAddress("GOTSubscription factory", await gotSubscription.read.GOT_FACTORY(), gotFactoryAddress);
    assertAddress(
      "GOTSubscription Spend Permission Manager",
      await gotSubscription.read.SPEND_PERMISSION_MANAGER(),
      config.spendPermissionManager,
    );

    const [gotIntentCode, gotFactoryCode, gotNameCode, gotSubscriptionCode] = await Promise.all([
      requireCode(publicClient, gotIntentAddress, "GOTIntent"),
      requireCode(publicClient, gotFactoryAddress, "GOTFactory"),
      requireCode(publicClient, gotNameAddress, "GOTName"),
      requireCode(publicClient, gotSubscriptionAddress, "GOTSubscription"),
    ]);

    const deploymentResult: DeploymentResult = {
      chainId,
      chainKey: config.key,
      network: networkName,
      deployer: deployer.account.address,
      create2Salt: create2.rawSalt,
      create2GuardedSalt: create2.guardedSalt,
      constructorArguments: {
        treasury: config.treasury,
        gotNameClaimVerifier: config.gotNameClaimVerifier,
        executionShareBps: config.executionShareBps,
        partnerShareBps: config.partnerShareBps,
        maxFeeBps: config.maxFeeBps,
      },
      dependencies: {
        usdc: config.usdc,
        spendPermissionManager: config.spendPermissionManager,
      },
      contracts: {
        gotIntent: gotIntentAddress,
        gotFactory: gotFactoryAddress,
        gotName: gotNameAddress,
        gotSubscription: gotSubscriptionAddress,
      },
      creationCodeHashes: {
        gotIntent: keccak256(create2.gotIntentBytecode),
        gotFactory: keccak256(create2.gotFactoryBytecode),
      },
      runtimeCodeHashes: {
        gotIntent: keccak256(gotIntentCode),
        gotFactory: keccak256(gotFactoryCode),
        gotName: keccak256(gotNameCode),
        gotSubscription: keccak256(gotSubscriptionCode),
      },
    };

    await mkdir(DEPLOYMENTS_DIR, { recursive: true });
    await writeFile(deploymentFile, `${JSON.stringify(deploymentResult, null, 2)}\n`, "utf8");

    console.log("Deployment complete");
    console.log(`Saved deployment result to ${deploymentFile}`);
    console.log(JSON.stringify(deploymentResult, null, 2));
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
