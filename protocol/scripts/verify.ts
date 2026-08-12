import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import hre from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Address } from "viem";

type BaseDeployment = {
  chainId: number;
  network: string;
  constructorArguments: {
    treasury: Address;
    gotNameClaimVerifier: Address;
    executionShareBps: number;
    partnerShareBps: number;
    maxFeeBps: number;
  };
  dependencies: {
    spendPermissionManager: Address;
  };
  contracts: {
    gotIntent: Address;
    gotFactory: Address;
    gotName: Address;
    gotSubscription: Address;
  };
};

const deploymentFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../deployments/base.json");

async function main(): Promise<void> {
  const deployment = JSON.parse(await readFile(deploymentFile, "utf8")) as BaseDeployment;
  if (deployment.chainId !== 8_453 || deployment.network !== "base" || deployment.contracts === undefined) {
    throw new Error(`${deploymentFile} is not a complete Base deployment`);
  }

  const { constructorArguments: args, contracts, dependencies } = deployment;
  const verifications = [
    {
      name: "GOTIntent",
      address: contracts.gotIntent,
      contract: "contracts/core/GOTIntent.sol:GOTIntent",
      constructorArgs: [args.treasury, args.executionShareBps, args.partnerShareBps],
    },
    {
      name: "GOTFactory",
      address: contracts.gotFactory,
      contract: "contracts/core/GOTFactory.sol:GOTFactory",
      constructorArgs: [
        contracts.gotIntent,
        args.treasury,
        args.executionShareBps,
        args.partnerShareBps,
        args.maxFeeBps,
      ],
    },
    {
      name: "GOTName",
      address: contracts.gotName,
      contract: "contracts/periphery/GOTName.sol:GOTName",
      constructorArgs: [args.gotNameClaimVerifier],
    },
    {
      name: "GOTSubscription",
      address: contracts.gotSubscription,
      contract: "contracts/periphery/GOTSubscription.sol:GOTSubscription",
      constructorArgs: [contracts.gotFactory, dependencies.spendPermissionManager],
    },
  ] as const;

  for (const verification of verifications) {
    console.log(`Verifying ${verification.name} at ${verification.address}`);
    await verifyContract(
      {
        address: verification.address,
        constructorArgs: [...verification.constructorArgs],
        contract: verification.contract,
        provider: "etherscan",
      },
      hre,
    );
  }

  console.log("BaseScan verification complete");
}

await main();
