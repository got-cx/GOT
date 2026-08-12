import {
  decodeEventLog,
  encodeAbiParameters,
  encodeDeployData,
  getAddress,
  getCreate2Address,
  keccak256,
  type Abi,
  type Address,
  type Hex,
} from "viem";

export const CREATE_X_ADDRESS = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed" as const;
export const CREATE_X_DEPLOYED_BYTECODE_HASH =
  "0xbd8a7ea8cfca7b4e5f5041d7d4b17bc317c5ce42cfbc42066a00cf26b43eb53f" as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const CREATE_X_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "bytes", name: "initCode", type: "bytes" },
    ],
    name: "deployCreate2",
    outputs: [{ internalType: "address", name: "newContract", type: "address" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "newContract", type: "address" },
      { indexed: true, internalType: "bytes32", name: "salt", type: "bytes32" },
    ],
    name: "ContractCreation",
    type: "event",
  },
] as const;

type Artifact = {
  abi: Abi;
  bytecode: string;
};

type ArtifactResolver = {
  readArtifact: (name: string) => Promise<Artifact>;
};

type GOTArtifacts = {
  gotIntentArtifact: Artifact;
  gotFactoryArtifact: Artifact;
};

type GOTConstructorConfig = {
  treasury: Address;
  executionShareBps: number;
  partnerShareBps: number;
  maxFeeBps: number;
};

type PredictGOTDeploymentParams = GOTConstructorConfig & {
  artifacts: ArtifactResolver;
  rawSalt: Hex;
};

export type GOTDeploymentPrediction = {
  rawSalt: Hex;
  guardedSalt: Hex;
  gotIntent: Address;
  gotFactory: Address;
  gotIntentBytecode: Hex;
  gotFactoryBytecode: Hex;
};

type PredictWithArtifactsParams = GOTConstructorConfig &
  GOTArtifacts & {
    rawSalt: Hex;
  };

type ResolveGOTSaltParams = GOTConstructorConfig & {
  artifacts: ArtifactResolver;
  deployer: Address;
  requestedSalt?: Hex;
  vanityPrefix: string;
  vanitySearchLimit: number;
  vanityNamespace: string;
};

// Hardhat's connected clients carry network-specific generic parameters that
// aren't useful to this small, network-agnostic CreateX helper.
type PublicClientLike = any;
type WalletClientLike = any;

function guardCreateXSalt(rawSalt: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: "bytes32" }], [rawSalt]));
}

function createSaltCandidate(namespace: string, nonce: bigint): Hex {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "uint256" }], [namespace, nonce]));
}

function isCreateXSafeSalt(rawSalt: Hex, deployer: Address): boolean {
  const first20Bytes = getAddress(`0x${rawSalt.slice(2, 42)}`);
  return first20Bytes !== ZERO_ADDRESS && first20Bytes !== getAddress(deployer);
}

function requireBytes32Hex(name: string, value: string): Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte hex string`);
  }

  return value as Hex;
}

export async function predictGOTDeployment({
  artifacts,
  ...params
}: PredictGOTDeploymentParams): Promise<GOTDeploymentPrediction> {
  const [gotIntentArtifact, gotFactoryArtifact] = await Promise.all([
    artifacts.readArtifact("GOTIntent"),
    artifacts.readArtifact("GOTFactory"),
  ]);
  return predictWithArtifacts({ gotIntentArtifact, gotFactoryArtifact, ...params });
}

function predictWithArtifacts({
  gotIntentArtifact,
  gotFactoryArtifact,
  rawSalt,
  treasury,
  executionShareBps,
  partnerShareBps,
  maxFeeBps,
}: PredictWithArtifactsParams): GOTDeploymentPrediction {
  const checkedSalt = requireBytes32Hex("rawSalt", rawSalt);
  const guardedSalt = guardCreateXSalt(checkedSalt);

  const gotIntentBytecode = encodeDeployData({
    abi: gotIntentArtifact.abi,
    bytecode: gotIntentArtifact.bytecode as Hex,
    args: [treasury, executionShareBps, partnerShareBps],
  });
  const gotIntent = getCreate2Address({
    from: CREATE_X_ADDRESS,
    salt: guardedSalt,
    bytecodeHash: keccak256(gotIntentBytecode),
  });

  const gotFactoryBytecode = encodeDeployData({
    abi: gotFactoryArtifact.abi,
    bytecode: gotFactoryArtifact.bytecode as Hex,
    args: [gotIntent, treasury, executionShareBps, partnerShareBps, maxFeeBps],
  });
  const gotFactory = getCreate2Address({
    from: CREATE_X_ADDRESS,
    salt: guardedSalt,
    bytecodeHash: keccak256(gotFactoryBytecode),
  });

  return {
    rawSalt: checkedSalt,
    guardedSalt,
    gotIntent,
    gotFactory,
    gotIntentBytecode,
    gotFactoryBytecode,
  };
}

export async function resolveGOTSalt({
  artifacts,
  deployer,
  requestedSalt,
  vanityPrefix,
  vanitySearchLimit,
  vanityNamespace,
  ...constructorConfig
}: ResolveGOTSaltParams): Promise<GOTDeploymentPrediction> {
  const [gotIntentArtifact, gotFactoryArtifact] = await Promise.all([
    artifacts.readArtifact("GOTIntent"),
    artifacts.readArtifact("GOTFactory"),
  ]);
  const predict = (rawSalt: Hex) =>
    predictWithArtifacts({
      gotIntentArtifact,
      gotFactoryArtifact,
      rawSalt,
      ...constructorConfig,
    });

  if (requestedSalt !== undefined) {
    const prediction = predict(requestedSalt);
    if (!prediction.gotFactory.toLowerCase().startsWith(vanityPrefix.toLowerCase())) {
      throw new Error(
        `Configured CREATE2 salt produces factory ${prediction.gotFactory}, which does not match ${vanityPrefix}`,
      );
    }
    return prediction;
  }

  const normalizedPrefix = vanityPrefix.toLowerCase();
  for (let nonce = 0n; nonce < BigInt(vanitySearchLimit); nonce += 1n) {
    const candidate = createSaltCandidate(vanityNamespace, nonce);
    if (!isCreateXSafeSalt(candidate, deployer)) {
      continue;
    }

    const prediction = predict(candidate);
    if (prediction.gotFactory.toLowerCase().startsWith(normalizedPrefix)) {
      return prediction;
    }
  }

  throw new Error(`Unable to find a CREATE2 salt for prefix ${normalizedPrefix} within ${vanitySearchLimit} attempts`);
}

export async function ensureCreateXFactory(publicClient: PublicClientLike): Promise<void> {
  const code = await publicClient.getCode({ address: CREATE_X_ADDRESS });
  if (code === undefined || code === "0x") {
    throw new Error(`CreateX is not deployed at ${CREATE_X_ADDRESS}`);
  }
  if (keccak256(code) !== CREATE_X_DEPLOYED_BYTECODE_HASH) {
    throw new Error(`Unexpected CreateX bytecode at ${CREATE_X_ADDRESS}`);
  }
}

export async function deployCreate2Contract({
  publicClient,
  walletClient,
  salt,
  bytecode,
  confirmations,
}: {
  publicClient: PublicClientLike;
  walletClient: WalletClientLike;
  salt: Hex;
  bytecode: Hex;
  confirmations: number;
}): Promise<Address> {
  if (walletClient.account === undefined) {
    throw new Error("CREATE2 deployment requires a wallet account");
  }

  const hash = await walletClient.writeContract({
    address: CREATE_X_ADDRESS,
    abi: CREATE_X_ABI,
    functionName: "deployCreate2",
    args: [salt, bytecode],
    account: walletClient.account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations });
  if (receipt.status !== "success") {
    throw new Error(`CreateX deployment transaction ${hash} reverted`);
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CREATE_X_ADDRESS.toLowerCase()) {
      continue;
    }

    const decoded = decodeEventLog({
      abi: CREATE_X_ABI,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
      eventName: "ContractCreation",
    });
    if (decoded.eventName === "ContractCreation") {
      return decoded.args.newContract;
    }
  }

  throw new Error("CreateX deployment event not found");
}
