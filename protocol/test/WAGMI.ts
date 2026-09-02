import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConfig, http, writeContract } from "@wagmi/core";
import { base } from "@wagmi/core/chains";
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  keccak256,
  stringToHex,
  zeroAddress,
  zeroHash,
  type Address,
} from "viem";

import {
  baseDeployment,
  GOTFactoryAbi,
  GOTFactoryAddress,
  GOTFactoryAddressByChainId,
  GOTIntentAbi,
  GOTLensAbi,
  GOTLensAddressByChainId,
  GOTNameAbi,
  GOTNameAddress,
  GOTNameAddressByChainId,
  GOTSubscriptionAbi,
  GOTSubscriptionAddress,
  GOTSubscriptionAddressByChainId,
  IGOTFactoryAbi,
  IGOTIntentAbi,
  IGOTNameAbi,
  IGOTOwnerResolverAbi,
  ISpendPermissionManagerAbi,
  ISpendPermissionManagerAddress,
  protocolDeployments,
  readGOTFactoryPreviewAddress,
  readGOTFactoryTreasury,
  spendPermissionManagerAddressByChainId,
  USDCAddressByChainId,
  writeGOTFactoryDeployAndExecute,
} from "../sdk/index.js";
import { listSupportedChains } from "../scripts/config.js";
import * as wagmiExports from "../sdk/wagmi.js";

/** Base configuration used by the SDK examples. Add a connector/account before sending writes. */
export const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
});

/** Builds a direct-owner, zero-fee, non-recurring USDC intent. */
export function createDirectUSDCIntentConfig(recipient: Address, reference: string, amount: bigint) {
  return {
    intentId: keccak256(stringToHex(`intent:${reference}`)),
    ownerSource: recipient,
    ownerKey: zeroHash,
    token: USDCAddressByChainId[base.id],
    partner: zeroAddress,
    authorizedResolver: zeroAddress,
    amount,
    initialDeadline: 0n,
    period: 0,
    feeBps: 0,
    metadataHash: keccak256(stringToHex(`metadata:${reference}`)),
  } as const;
}

/** Previews the counterfactual address, funds it, then deploys and executes the intent. */
export async function fundAndExecuteDirectUSDCIntent(recipient: Address, reference: string, amount: bigint) {
  const intentConfig = createDirectUSDCIntentConfig(recipient, reference, amount);
  const intentAddress = await readGOTFactoryPreviewAddress(wagmiConfig, {
    args: [intentConfig],
  });

  await writeContract(wagmiConfig, {
    abi: erc20Abi,
    address: intentConfig.token,
    functionName: "transfer",
    args: [intentAddress, amount],
  });

  await writeGOTFactoryDeployAndExecute(wagmiConfig, {
    args: [intentConfig],
  });

  return intentAddress;
}

describe("GOT wagmi SDK", function () {
  it("exports every manifest ABI as a typed wagmi ABI", function () {
    for (const abi of [
      GOTFactoryAbi,
      GOTIntentAbi,
      GOTLensAbi,
      GOTNameAbi,
      GOTSubscriptionAbi,
      IGOTFactoryAbi,
      IGOTIntentAbi,
      IGOTNameAbi,
      IGOTOwnerResolverAbi,
      ISpendPermissionManagerAbi,
    ]) {
      assert.ok(abi.length > 0);
    }
    assert.equal("gotFactoryAbi" in wagmiExports, false);
    assert.equal("igotFactoryAbi" in wagmiExports, false);
    assert.equal(typeof readGOTFactoryTreasury, "function");
  });

  it("binds generated actions and address maps to the Base deployment", function () {
    const chainId = 8453;
    const { contracts, dependencies } = baseDeployment;
    const { gotLens } = contracts;

    assert.equal(baseDeployment.chainId, chainId);
    assert.equal(baseDeployment.protocolVersion, "GOT_PROTOCOL_V0_3");
    assert.equal(protocolDeployments[chainId], baseDeployment);
    assert.equal(GOTFactoryAddress[chainId], getAddress(contracts.gotFactory));
    assert.equal(GOTFactoryAddressByChainId[chainId], contracts.gotFactory);
    assert.equal(GOTLensAddressByChainId[chainId], gotLens);
    assert.equal(GOTNameAddress[chainId], getAddress(contracts.gotName));
    assert.equal(GOTNameAddressByChainId[chainId], contracts.gotName);
    assert.equal(GOTSubscriptionAddress[chainId], getAddress(contracts.gotSubscription));
    assert.equal(GOTSubscriptionAddressByChainId[chainId], contracts.gotSubscription);
    assert.equal(ISpendPermissionManagerAddress[chainId], getAddress(dependencies.spendPermissionManager));
    assert.equal(spendPermissionManagerAddressByChainId[chainId], dependencies.spendPermissionManager);
  });

  it("keeps protocolVersion in deployment-script output configuration", function () {
    const baseConfig = listSupportedChains().find((config) => config.chainId === 8453);
    assert.equal(baseConfig?.protocolVersion, baseDeployment.protocolVersion);
  });

  it("builds a type-safe direct USDC intent", function () {
    const recipient = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
    const intentConfig = createDirectUSDCIntentConfig(recipient, "invoice-2026-0001", 100_000_000n);
    const calldata = encodeFunctionData({
      abi: GOTFactoryAbi,
      functionName: "previewAddress",
      args: [intentConfig],
    });

    assert.equal(intentConfig.ownerSource, recipient);
    assert.equal(intentConfig.token, USDCAddressByChainId[base.id]);
    assert.ok(calldata.startsWith("0x"));
  });
});
