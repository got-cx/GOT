import type { Address } from "viem";

import baseDeploymentJson from "../deployments/base.json" with { type: "json" };

export type GOTDeploymentConfig = {
  chainId: number;
  chainKey: string;
  network: string;
  protocolVersion: string;
  deployer: string;
  create2Salt: string;
  create2GuardedSalt: string;
  constructorArguments: {
    treasury: string;
    gotNameClaimVerifier: string;
    executionShareBps: number;
    partnerShareBps: number;
    maxFeeBps: number;
  };
  dependencies: {
    usdc: string;
    spendPermissionManager: string;
  };
  contracts: {
    gotIntent: string;
    gotFactory: string;
    gotLens: string;
    gotName: string;
    gotSubscription: string;
  };
  creationCodeHashes: {
    gotIntent: string;
    gotFactory: string;
  };
  runtimeCodeHashes: {
    gotIntent: string;
    gotFactory: string;
    gotLens: string;
    gotName: string;
    gotSubscription: string;
  };
};

export const baseDeployment = baseDeploymentJson satisfies GOTDeploymentConfig;

export const protocolDeployments = {
  [baseDeployment.chainId]: baseDeployment,
} as const satisfies Record<number, GOTDeploymentConfig>;

function contractAddressMap(contractName: keyof GOTDeploymentConfig["contracts"]): Record<number, Address> {
  return Object.fromEntries(
    Object.values(protocolDeployments).map((deployment) => [
      deployment.chainId,
      deployment.contracts[contractName] as Address,
    ]),
  );
}

function dependencyAddressMap(dependencyName: keyof GOTDeploymentConfig["dependencies"]): Record<number, Address> {
  return Object.fromEntries(
    Object.values(protocolDeployments).map((deployment) => [
      deployment.chainId,
      deployment.dependencies[dependencyName] as Address,
    ]),
  );
}

/** The locked GOTIntent implementation, not an address that should receive user funds. */
export const GOTIntentImplementationAddressByChainId = contractAddressMap("gotIntent");
export const GOTFactoryAddressByChainId = contractAddressMap("gotFactory");
export const GOTLensAddressByChainId = contractAddressMap("gotLens");
export const GOTNameAddressByChainId = contractAddressMap("gotName");
export const GOTSubscriptionAddressByChainId = contractAddressMap("gotSubscription");
export const USDCAddressByChainId = dependencyAddressMap("usdc");
export const spendPermissionManagerAddressByChainId = dependencyAddressMap("spendPermissionManager");
