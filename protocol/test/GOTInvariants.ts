import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  encodeFunctionData,
  getAddress,
  keccak256,
  stringToHex,
  toFunctionSelector,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

type IntentConfig = {
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

const ZERO_KEY = `0x${"00".repeat(32)}` as Hex;
const key = (label: string) => keccak256(stringToHex(label));

describe("GOT invariants", async function () {
  const { viem, networkHelpers } = await network.create();
  const [deployer, treasury, ownerA, ownerB, partnerA, partnerB, executor, restrictedResolver, stranger] =
    await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  async function deployCore() {
    const token = await viem.deployContract("MockERC20");
    const implementation = await viem.deployContract("GOTIntent", [treasury.account.address, 2_000, 2_500]);
    const factory = await viem.deployContract("GOTFactory", [
      implementation.address,
      treasury.account.address,
      2_000,
      2_500,
      1_000,
    ]);
    return { token, implementation, factory };
  }

  function directConfig(token: Address, overrides: Partial<IntentConfig> = {}): IntentConfig {
    return {
      intentId: key("GOT_TS_SECURITY_INTENT"),
      ownerSource: ownerA.account.address,
      ownerKey: ZERO_KEY,
      token,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 100_000n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: key("GOT_TS_METADATA"),
      ...overrides,
    };
  }

  it("INV-1/2: identity is deterministic and canonical deployment preserves the suffix runtime", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployCore);
    const config = directConfig(token.address);

    const first = await factory.read.previewAddress([config]);
    const second = await factory.read.previewAddress([config]);
    const changed = await factory.read.previewAddress([{ ...config, metadataHash: key("different metadata") }]);
    assert.equal(first, second);
    assert.notEqual(first, changed);
    assert.equal(await publicClient.getCode({ address: first }), undefined);

    await token.write.mint([first, 1n], { account: deployer.account });
    await factory.write.deployAndExecute([config], {
      account: executor.account,
    });
    const runtime = await publicClient.getCode({ address: first });
    assert.ok(runtime !== undefined);
    assert.equal((runtime.length - 2) / 2, 283);
    assert.ok(runtime.endsWith("00e2")); // uint16_be(226)
  });

  it("INV-3/4/5: direct ownership is standalone, explicit, and fully immutable", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const resolverSource = await viem.deployContract("MockOwnerResolver");
    await resolverSource.write.setOwner([ownerB.account.address]);
    const config = directConfig(token.address, {
      ownerSource: resolverSource.address,
      ownerKey: ZERO_KEY,
      partner: partnerA.account.address,
      feeBps: 37,
    });
    const predicted = await factory.read.previewAddress([config]);
    await token.write.mint([predicted, 10_000n]);
    await factory.write.deployAndExecute([config], {
      account: executor.account,
    });
    const intent = await viem.getContractAt("GOTIntent", predicted);

    // A zero key is direct mode even if ownerSource happens to implement the resolver interface.
    assert.equal(getAddress(await intent.read.owner()), getAddress(resolverSource.address));
    assert.equal(await intent.read.intentId(), config.intentId);
    assert.equal(getAddress(await intent.read.ownerSource()), getAddress(config.ownerSource));
    assert.equal(await intent.read.ownerKey(), config.ownerKey);
    assert.equal(getAddress(await intent.read.token()), getAddress(config.token));
    assert.equal(getAddress(await intent.read.partner()), getAddress(config.partner));
    assert.equal(getAddress(await intent.read.authorizedResolver()), getAddress(config.authorizedResolver));
    assert.equal(await intent.read.amount(), config.amount);
    assert.equal(await intent.read.initialDeadline(), config.initialDeadline);
    assert.equal(await intent.read.period(), config.period);
    assert.equal(await intent.read.feeBps(), config.feeBps);
    assert.equal(await intent.read.metadataHash(), config.metadataHash);
    assert.equal(getAddress(await intent.read.factory()), getAddress(factory.address));

    await viem.assertions.revertWithCustomError(
      implementation.read.owner(),
      implementation,
      "DirectImplementationCall",
    );
  });

  it("INV-6/7/9/10/16: unresolved ownership fails closed, rolls back, then follows migration", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const resolver = await viem.deployContract("MockOwnerResolver");
    const config = directConfig(token.address, {
      ownerSource: resolver.address,
      ownerKey: key("alice resolver key"),
      amount: 100n,
    });
    const predicted = await factory.read.previewAddress([config]);
    await token.write.mint([predicted, 100n]);

    await viem.assertions.revertWithCustomError(
      factory.write.deployAndExecute([config], {
        account: executor.account,
      }),
      implementation,
      "OwnerUnresolved",
    );
    assert.equal(await publicClient.getCode({ address: predicted }), undefined);
    assert.equal(await token.read.balanceOf([predicted]), 100n);

    await resolver.write.setOwner([ownerA.account.address]);
    await factory.write.deployAndExecute([config], {
      account: executor.account,
    });
    assert.equal(await token.read.balanceOf([ownerA.account.address]), 100n);

    const intent = await viem.getContractAt("GOTIntent", predicted);
    await resolver.write.setOwner([ownerB.account.address]);
    await token.write.mint([predicted, 77n]);
    await viem.assertions.emitWithArgs(intent.write.settle({ account: ownerB.account }), intent, "TransferProcessed", [
      ownerB.account.address,
      ownerB.account.address,
      zeroAddress,
      77n,
      77n,
      0n,
      0n,
      0n,
      177n,
    ]);
    assert.equal(getAddress(await intent.read.owner()), getAddress(ownerB.account.address));
  });

  it("INV-8/18: one cached owner controls payout and event despite mid-execution migration", async function () {
    const { implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const token = await viem.deployContract("ReentrantERC20");
    const resolver = await viem.deployContract("MockOwnerResolver");
    await resolver.write.setOwner([ownerA.account.address]);
    const config = directConfig(token.address, {
      ownerSource: resolver.address,
      ownerKey: key("migrating owner"),
      partner: partnerA.account.address,
      feeBps: 100,
    });
    const predicted = await factory.read.previewAddress([config]);
    const intent = await viem.getContractAt("GOTIntent", predicted);
    await token.write.mint([predicted, 100_000n]);
    await token.write.setCallbackFrom([
      predicted,
      resolver.address,
      encodeFunctionData({
        abi: resolver.abi,
        functionName: "setOwner",
        args: [ownerB.account.address],
      }),
    ]);

    await viem.assertions.emitWithArgs(
      factory.write.deployAndExecute([config], {
        account: executor.account,
      }),
      intent,
      "TransferProcessed",
      [
        executor.account.address,
        ownerA.account.address,
        partnerA.account.address,
        100_000n,
        99_000n,
        600n,
        200n,
        200n,
        100_000n,
      ],
    );
    assert.equal(await token.read.callbackSucceeded(), true);
    assert.equal(await token.read.balanceOf([ownerA.account.address]), 99_000n);
    assert.equal(await token.read.balanceOf([ownerB.account.address]), 0n);
    assert.equal(getAddress(await intent.read.owner()), getAddress(ownerB.account.address));
    assert.equal(await implementation.read.OWNER_RESOLVER_GAS_LIMIT(), 50_000n);
  });

  it("INV-9/16: restricted resolver failure is atomic and cannot block owner sovereignty", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const config = directConfig(token.address, {
      authorizedResolver: restrictedResolver.account.address,
    });
    const predicted = await factory.read.previewAddress([config]);
    await token.write.mint([predicted, 1_000n]);

    await viem.assertions.revertWithCustomError(
      factory.write.deployAndExecute([config], {
        account: stranger.account,
      }),
      implementation,
      "UnauthorizedResolver",
    );
    assert.equal(await publicClient.getCode({ address: predicted }), undefined);

    await factory.write.deployAndExecute([config], {
      account: ownerA.account,
    });
    assert.equal(await token.read.balanceOf([ownerA.account.address]), 1_000n);
  });

  it("INV-11/13/15: zero and positive fees conserve value, pay fixed recipients, and clear balances", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployCore);
    const zeroConfig = directConfig(token.address, {
      intentId: key("zero fee"),
      feeBps: 0,
    });
    const zeroIntent = await factory.read.previewAddress([zeroConfig]);
    await token.write.mint([zeroIntent, 50_000n]);
    await factory.write.deployAndExecute([zeroConfig], {
      account: executor.account,
    });
    assert.equal(await token.read.balanceOf([ownerA.account.address]), 50_000n);
    assert.equal(await token.read.balanceOf([zeroIntent]), 0n);

    const feeConfig = directConfig(token.address, {
      intentId: key("positive fee"),
      ownerSource: ownerB.account.address,
      partner: partnerA.account.address,
      feeBps: 100,
    });
    const feeIntent = await factory.read.previewAddress([feeConfig]);
    await token.write.mint([feeIntent, 100_000n]);
    await factory.write.deployAndExecute([feeConfig], {
      account: executor.account,
    });
    assert.equal(await token.read.balanceOf([ownerB.account.address]), 99_000n);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 600n);
    assert.equal(await token.read.balanceOf([partnerA.account.address]), 200n);
    assert.equal(await token.read.balanceOf([executor.account.address]), 200n);
    assert.equal(await token.read.balanceOf([feeIntent]), 0n);
  });

  it("INV-12: cumulative positive-fee allocation is invariant to funding partitions", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const oneConfig = directConfig(token.address, {
      intentId: key("one partition"),
      ownerSource: ownerA.account.address,
      partner: partnerA.account.address,
      feeBps: 137,
    });
    const splitConfig = directConfig(token.address, {
      intentId: key("many partitions"),
      ownerSource: ownerB.account.address,
      partner: partnerB.account.address,
      feeBps: 137,
    });
    const oneIntent = await factory.read.previewAddress([oneConfig]);
    const splitIntent = await factory.read.previewAddress([splitConfig]);
    const fromBlock = await publicClient.getBlockNumber();

    await token.write.mint([oneIntent, 100_003n]);
    await factory.write.deployAndExecute([oneConfig], {
      account: executor.account,
    });

    const split = await viem.getContractAt("GOTIntent", splitIntent);
    const pieces = [1n, 7n, 99n, 5_001n, 31_337n, 42_000n, 21_558n];
    for (const [index, piece] of pieces.entries()) {
      await token.write.mint([splitIntent, piece]);
      if (index === 0) {
        await factory.write.deployAndExecute([splitConfig], {
          account: executor.account,
        });
      } else {
        await split.write.resolve({ account: executor.account });
      }
    }

    const oneEvents = await publicClient.getContractEvents({
      address: oneIntent,
      abi: implementation.abi,
      eventName: "TransferProcessed",
      fromBlock,
      strict: true,
    });
    const splitEvents = await publicClient.getContractEvents({
      address: splitIntent,
      abi: implementation.abi,
      eventName: "TransferProcessed",
      fromBlock,
      strict: true,
    });
    const allocation = (events: typeof oneEvents) =>
      events.reduce(
        (total, event) => ({
          gross: total.gross + event.args.processedAmount,
          owner: total.owner + event.args.ownerAmount,
          treasury: total.treasury + event.args.treasuryFee,
          partner: total.partner + event.args.partnerReward,
          executor: total.executor + event.args.executionReward,
        }),
        { gross: 0n, owner: 0n, treasury: 0n, partner: 0n, executor: 0n },
      );
    assert.deepEqual(allocation(splitEvents), allocation(oneEvents));
    assert.equal(await split.read.totalProcessed(), 100_003n);
  });

  it("INV-14: configured-token recovery is impossible while other assets remain owner-controlled", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployCore);
    const otherToken = await viem.deployContract("MockERC20");
    const config = directConfig(token.address);
    const predicted = await factory.read.previewAddress([config]);
    await token.write.mint([predicted, 1n]);
    await factory.write.deployAndExecute([config], {
      account: executor.account,
    });
    const intent = await viem.getContractAt("GOTIntent", predicted);
    await otherToken.write.mint([predicted, 55n]);

    await viem.assertions.revertWithCustomError(
      intent.write.recoverERC20([otherToken.address], {
        account: stranger.account,
      }),
      intent,
      "UnauthorizedOwner",
    );
    await intent.write.recoverERC20([otherToken.address], {
      account: ownerA.account,
    });
    assert.equal(await otherToken.read.balanceOf([ownerA.account.address]), 55n);
    await viem.assertions.revertWithCustomError(
      intent.write.recoverERC20([token.address], { account: ownerA.account }),
      intent,
      "ConfiguredTokenNotRecoverable",
    );
  });

  it("INV-17: a malicious ERC20 callback cannot reenter processing", async function () {
    const { implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const malicious = await viem.deployContract("ReentrantERC20");
    const config = directConfig(malicious.address, {
      partner: partnerA.account.address,
      feeBps: 100,
    });
    const predicted = await factory.read.previewAddress([config]);
    await malicious.write.mint([predicted, 100_000n]);
    await malicious.write.setCallback([
      predicted,
      encodeFunctionData({ abi: implementation.abi, functionName: "resolve" }),
    ]);

    await factory.write.deployAndExecute([config], {
      account: executor.account,
    });
    const intent = await viem.getContractAt("GOTIntent", predicted);
    assert.equal(await malicious.read.callbackAttempted(), true);
    assert.equal(await malicious.read.callbackSucceeded(), false);
    assert.equal(await malicious.read.balanceOf([predicted]), 0n);
    assert.equal(await intent.read.totalProcessed(), 100_000n);
  });

  it("INV-19: every implementation selector prefix is rejected so native funding remains payable", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployCore);
    const functions = implementation.abi.filter((item) => item.type === "function");
    assert.ok(functions.length > 0);

    for (const abiFunction of functions) {
      const selector = toFunctionSelector(abiFunction);
      const intentId = `${selector}${"00".repeat(28)}` as Hex;
      await viem.assertions.revertWithCustomError(
        factory.read.previewAddress([directConfig(token.address, { intentId })]),
        factory,
        "InvalidConfiguration",
      );
    }

    const validConfig = directConfig(token.address, {
      intentId: key("native funding selector safety"),
    });
    const validIntent = await factory.read.previewAddress([validConfig]);
    await token.write.mint([validIntent, 1n]);
    await factory.write.deployAndExecute([validConfig], {
      account: executor.account,
    });
    await deployer.sendTransaction({ to: validIntent, value: 1n });
    assert.equal(await publicClient.getBalance({ address: validIntent }), 1n);

    const intent = await viem.getContractAt("GOTIntent", validIntent);
    await intent.write.recoverNative({ account: ownerA.account });
    assert.equal(await publicClient.getBalance({ address: validIntent }), 0n);
  });
});
