import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveIntentAddress, type IntentConfig } from "../sdk/intent.js";
import { toFunctionSelector, zeroAddress, zeroHash, type Address } from "viem";

const owner = "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76" as Address;
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const resolver = "0x60700c99a58fD21022bf1f4d2b318C663e6F2E27" as Address;
const partner = "0xca87066dA08fF49efF7C19244ADD4036991ba811" as Address;

export const intentAddressGoldenVectors: ReadonlyArray<{
  name: string;
  config: IntentConfig;
  expected: Address;
}> = [
  {
    name: "open amount",
    config: {
      intentId: "0x535f41d712a33e932b4e825647d5a93253e97eda0526f1f0dff6759559154cd4",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 0n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: zeroHash,
    },
    expected: "0x83a3de04E4E601191213b22d8911e5E121aF369E",
  },
  {
    name: "fixed amount",
    config: {
      intentId: "0x5684816b1a8687d59221f5c9bb14544cf23fb2b145aa1c2be1c5b4c7b96088b3",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 100_000_000n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: zeroHash,
    },
    expected: "0x202fb2A63F34990B6D6556108c657357C98182DD",
  },
  {
    name: "committed metadata",
    config: {
      intentId: "0x5684816b1a8687d59221f5c9bb14544cf23fb2b145aa1c2be1c5b4c7b96088b3",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 0n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: "0x50c543de73315aea166cbe4ff285aec64d2ea8b82b39cf92709f3fb8a8ad9b15",
    },
    expected: "0x09A6175bc485b1d2b1AA6Fc7daf9123217cBa86B",
  },
  {
    name: "deadline and recurring period",
    config: {
      intentId: "0xef3a822c12af3f2a6b7737a816c65971e611761b71b772eb907fd42b6aeaa64c",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 25_000_000n,
      initialDeadline: 1_800_000_000n,
      period: 2_592_000,
      feeBps: 0,
      metadataHash: zeroHash,
    },
    expected: "0xc89064f30DF70BE259f9763F7578b23F0646b250",
  },
  {
    name: "authorized resolver",
    config: {
      intentId: "0x5ad0785e8eb5358722d51c03ec10f544144ff6333e364da27979183b6285ba8f",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner: zeroAddress,
      authorizedResolver: resolver,
      amount: 0n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: zeroHash,
    },
    expected: "0x8cad2D6cA6EBCE60564d49a68cdbcA330900651C",
  },
  {
    name: "partner and positive fee",
    config: {
      intentId: "0x78507721ff38fdc87ed889a1b2e2e26a71fec078e6fd41b112885e898d7be27e",
      ownerSource: owner,
      ownerKey: zeroHash,
      token: usdc,
      partner,
      authorizedResolver: zeroAddress,
      amount: 0n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 30,
      metadataHash: zeroHash,
    },
    expected: "0x0Befa3B0E0ff8cD756C613E9A285519Ce5205AFF",
  },
];

describe("canonical Intent Address derivation", () => {
  for (const vector of intentAddressGoldenVectors) {
    it(`matches the ${vector.name} golden vector`, () => {
      assert.equal(deriveIntentAddress(vector.config), vector.expected);
    });
  }

  it("rejects unsupported chains", () => {
    assert.throws(() => deriveIntentAddress(intentAddressGoldenVectors[0]!.config, 1), /not deployed/);
  });

  for (const signature of ["recoverERC20(address)", "recoverNative()"]) {
    it(`rejects the ${signature} selector prefix`, () => {
      const intentId = `${toFunctionSelector(signature)}${"00".repeat(28)}` as `0x${string}`;
      assert.throws(
        () => deriveIntentAddress({ ...intentAddressGoldenVectors[0]!.config, intentId }),
        /function selector/,
      );
    });
  }
});
