import {
  concatHex,
  encodeAbiParameters,
  encodePacked,
  getAddress,
  getCreate2Address,
  isAddress,
  keccak256,
  stringToHex,
  toFunctionSelector,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

import { protocolDeployments, type GOTDeploymentConfig } from "./deployments.js";

export type IntentConfig = {
  intentId: Hex;
  ownerSource: Address;
  ownerKey: Hex;
  token: Address;
  partner: Address;
  authorizedResolver: Address;
  amount: bigint;
  initialDeadline: bigint;
  period: number;
  feeBps: number;
  metadataHash: Hex;
};

const MAX_UINT128 = (1n << 128n) - 1n;
const MAX_UINT64 = (1n << 64n) - 1n;
const MAX_UINT32 = 2 ** 32 - 1;
const MAX_UINT16 = 2 ** 16 - 1;

const intentSelectors = new Set(
  [
    "ERC165_GAS_LIMIT()",
    "EXECUTION_SHARE_BPS()",
    "IMMUTABLE_ARGS_LENGTH()",
    "OWNER_RESOLVER_GAS_LIMIT()",
    "PARTNER_SHARE_BPS()",
    "PROTOCOL_VERSION()",
    "TREASURY()",
    "amount()",
    "authorizedResolver()",
    "executeFor(address)",
    "factory()",
    "feeBps()",
    "initialDeadline()",
    "intentId()",
    "metadataHash()",
    "owner()",
    "ownerKey()",
    "ownerSource()",
    "partner()",
    "period()",
    "recoverERC20(address)",
    "recoverNative()",
    "resolve()",
    "settle()",
    "token()",
    "totalProcessed()",
  ].map((signature) => toFunctionSelector(signature)),
);

function deploymentFor(chainId: number): GOTDeploymentConfig {
  const deployment = protocolDeployments[chainId as keyof typeof protocolDeployments];
  if (!deployment) throw new Error(`GOT Protocol v0.3 is not deployed on chain ${chainId}.`);
  return deployment;
}

function validateInteger(value: number, field: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} is outside the supported range.`);
  }
}

function validatePreDerivation(config: IntentConfig, deployment: GOTDeploymentConfig): void {
  if (!isAddress(config.ownerSource) || getAddress(config.ownerSource) === zeroAddress) {
    throw new Error("A valid owner is required.");
  }
  if (!isAddress(config.token) || getAddress(config.token) === zeroAddress) {
    throw new Error("A valid token is required.");
  }
  if (config.amount < 0n || config.amount > MAX_UINT128) {
    throw new Error("Amount is outside the protocol uint128 range.");
  }
  if (config.initialDeadline < 0n || config.initialDeadline > MAX_UINT64) {
    throw new Error("Deadline is outside the protocol uint64 range.");
  }
  validateInteger(config.period, "Period", MAX_UINT32);
  validateInteger(config.feeBps, "Fee", MAX_UINT16);
  if (config.feeBps > deployment.constructorArguments.maxFeeBps) {
    throw new Error("Fee exceeds the canonical factory maximum.");
  }
  if (config.period !== 0 && config.initialDeadline === 0n) {
    throw new Error("A recurring Intent requires an initial deadline.");
  }
  if (intentSelectors.has(config.intentId.slice(0, 10) as Hex)) {
    throw new Error("Intent ID collides with a protocol function selector.");
  }
}

/** Canonical Solidity-equivalent hash of a v0.3 IntentConfig. */
export function hashIntentConfig(config: IntentConfig): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "bytes32" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint128" },
        { type: "uint64" },
        { type: "uint32" },
        { type: "uint16" },
        { type: "bytes32" },
      ],
      [
        config.intentId,
        config.ownerSource,
        config.ownerKey,
        config.token,
        config.partner,
        config.authorizedResolver,
        config.amount,
        config.initialDeadline,
        config.period,
        config.feeBps,
        config.metadataHash,
      ],
    ),
  );
}

function cloneCreationCode(config: IntentConfig, deployment: GOTDeploymentConfig): Hex {
  const immutableArgs = encodePacked(
    [
      "bytes32",
      "address",
      "bytes32",
      "address",
      "address",
      "address",
      "uint128",
      "uint64",
      "uint32",
      "uint16",
      "bytes32",
      "address",
    ],
    [
      config.intentId,
      config.ownerSource,
      config.ownerKey,
      config.token,
      config.partner,
      config.authorizedResolver,
      config.amount,
      config.initialDeadline,
      config.period,
      config.feeBps,
      config.metadataHash,
      getAddress(deployment.contracts.gotFactory),
    ],
  );
  const argsLength = (immutableArgs.length - 2) / 2;
  const extraLength = argsLength + 2;
  const runtimeLength = 55 + extraLength;
  return concatHex([
    "0x61",
    toHex(runtimeLength, { size: 2 }),
    "0x3d81600a3d39f3",
    "0x3d3d3d3d363d3d37",
    "0x61",
    toHex(extraLength, { size: 2 }),
    "0x6037363936",
    "0x61",
    toHex(extraLength, { size: 2 }),
    "0x013d73",
    getAddress(deployment.contracts.gotIntent),
    "0x5af43d3d93803e603557fd5bf3",
    immutableArgs,
    toHex(argsLength, { size: 2 }),
  ]);
}

function deriveUnchecked(config: IntentConfig, deployment: GOTDeploymentConfig): Address {
  const protocolVersion = keccak256(stringToHex(deployment.protocolVersion));
  const salt = keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [protocolVersion, hashIntentConfig(config)]),
  );
  return getAddress(
    getCreate2Address({
      from: getAddress(deployment.contracts.gotFactory),
      salt,
      bytecodeHash: keccak256(cloneCreationCode(config, deployment)),
    }),
  );
}

/** Validates the canonical v0.3 factory rules for an IntentConfig. */
export function validateIntentConfig(config: IntentConfig, chainId = 8453): void {
  const deployment = deploymentFor(chainId);
  validatePreDerivation(config, deployment);
  const intentAddress = deriveUnchecked(config, deployment);
  const forbidden = [
    config.ownerSource,
    config.token,
    deployment.constructorArguments.treasury,
    ...(getAddress(config.partner) === zeroAddress ? [] : [config.partner]),
    ...(getAddress(config.authorizedResolver) === zeroAddress ? [] : [config.authorizedResolver]),
  ].map((address) => getAddress(address));
  if (forbidden.includes(intentAddress)) {
    throw new Error("Intent configuration derives a forbidden address.");
  }
}

/** Pure local equivalent of canonical GOTFactory.previewAddress(). */
export function deriveIntentAddress(config: IntentConfig, chainId = 8453): Address {
  const deployment = deploymentFor(chainId);
  validatePreDerivation(config, deployment);
  const intentAddress = deriveUnchecked(config, deployment);
  const forbidden = [
    config.ownerSource,
    config.token,
    deployment.constructorArguments.treasury,
    ...(getAddress(config.partner) === zeroAddress ? [] : [config.partner]),
    ...(getAddress(config.authorizedResolver) === zeroAddress ? [] : [config.authorizedResolver]),
  ].map((address) => getAddress(address));
  if (forbidden.includes(intentAddress)) {
    throw new Error("Intent configuration derives a forbidden address.");
  }
  return intentAddress;
}
