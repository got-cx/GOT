import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeAbiParameters, keccak256, stringToHex, zeroAddress, type Address, type Hex } from "viem";

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

type InvoiceStatus = "OPEN" | "PARTIAL" | "SETTLED" | "OVERPAID";

const ZERO_KEY = `0x${"00".repeat(32)}` as Hex;
const id = (namespace: string, record: string) =>
  keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "string" }], [keccak256(stringToHex(namespace)), record]),
  );

// Product state is derived from finalized protocol facts; it is not stored in GOTIntent.
function invoiceStatus(ownerProceeds: bigint, target: bigint): InvoiceStatus {
  if (ownerProceeds === 0n) return "OPEN";
  if (ownerProceeds < target) return "PARTIAL";
  if (ownerProceeds === target) return "SETTLED";
  return "OVERPAID";
}

describe("GOT protocol product and integrator examples", async function () {
  const { viem, networkHelpers } = await network.create();
  const [
    deployer,
    protocolTreasury,
    merchant,
    payer,
    integratorTreasury,
    resolverOperator,
    nameVerifier,
    namedRecipient,
    migratedRecipient,
    subscriber,
    subscriptionKeeper,
  ] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  async function deployProtocol() {
    const token = await viem.deployContract("MockERC20");
    const implementation = await viem.deployContract("GOTIntent", [protocolTreasury.account.address, 2_000, 2_500]);
    const factory = await viem.deployContract("GOTFactory", [
      implementation.address,
      protocolTreasury.account.address,
      2_000,
      2_500,
      1_000,
    ]);
    return { token, implementation, factory };
  }

  function directIntent(token: Address, record: string, overrides: Partial<IntentConfig> = {}): IntentConfig {
    return {
      intentId: id("GOT_APPLICATION_INTENT_V2", record),
      ownerSource: merchant.account.address,
      ownerKey: ZERO_KEY,
      token,
      partner: zeroAddress,
      authorizedResolver: zeroAddress,
      amount: 1_000_000n,
      initialDeadline: 0n,
      period: 0,
      feeBps: 0,
      metadataHash: id("GOT_METADATA_V1", record),
      ...overrides,
    };
  }

  it("got.cx: settles a sponsored zero-fee transfer without taxing transfer volume", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployProtocol);
    const recipientTargetAmount = 250_000_000n; // 250 USDC at six decimals.
    const config = directIntent(token.address, "got-cx-transfer-001", {
      amount: recipientTargetAmount,
      feeBps: 0,
      partner: zeroAddress,
    });
    const intentAddress = await factory.read.previewAddress([config]);

    // got.cx can publish this address/link before any contract exists.
    assert.equal(await publicClient.getCode({ address: intentAddress }), undefined);
    await token.write.mint([payer.account.address, recipientTargetAmount]);
    await token.write.transfer([intentAddress, recipientTargetAmount], {
      account: payer.account,
    });

    // A got.cx-sponsored resolver pays gas; feeBps=0 means no token reward or volume tax.
    await factory.write.deployAndExecute([config], {
      account: resolverOperator.account,
    });
    assert.equal(await token.read.balanceOf([merchant.account.address]), recipientTargetAmount);
    assert.equal(await token.read.balanceOf([resolverOperator.account.address]), 0n);
    assert.equal(await token.read.balanceOf([protocolTreasury.account.address]), 0n);
    assert.equal(invoiceStatus(recipientTargetAmount, recipientTargetAmount), "SETTLED");
  });

  it("marketplace integrator: quotes an exact-net invoice and earns immutable partner rewards", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployProtocol);
    const recipientTargetAmount = 100_000_000n; // Merchant must receive exactly 100 USDC.
    const feeBps = 30; // The marketplace visibly charges 0.30% of gross.
    const grossQuotedAmount = await factory.read.quoteGrossAmount([recipientTargetAmount, feeBps]);
    const displayedServiceFee = grossQuotedAmount - recipientTargetAmount;
    assert.equal(await factory.read.quoteOwnerAmount([grossQuotedAmount, feeBps]), recipientTargetAmount);

    const config = directIntent(token.address, "marketplace-invoice-042", {
      amount: grossQuotedAmount,
      feeBps,
      partner: integratorTreasury.account.address,
    });
    const intentAddress = await factory.read.previewAddress([config]);
    await token.write.mint([intentAddress, grossQuotedAmount]);
    await factory.write.deployAndExecute([config], {
      account: resolverOperator.account,
    });

    const totalFee = displayedServiceFee;
    const executionReward = (totalFee * 2_000n) / 10_000n;
    const nonExecutionFee = totalFee - executionReward;
    const partnerReward = (nonExecutionFee * 2_500n) / 10_000n;
    const treasuryFee = nonExecutionFee - partnerReward;
    assert.equal(await token.read.balanceOf([merchant.account.address]), recipientTargetAmount);
    assert.equal(await token.read.balanceOf([integratorTreasury.account.address]), partnerReward);
    assert.equal(await token.read.balanceOf([resolverOperator.account.address]), executionReward);
    assert.equal(await token.read.balanceOf([protocolTreasury.account.address]), treasuryFee);
    assert.equal(recipientTargetAmount + partnerReward + executionReward + treasuryFee, grossQuotedAmount);
  });

  it("got.cx invoices: derives PARTIAL and OVERPAID after repeated and late funding", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployProtocol);
    const recipientTargetAmount = 1_000_000n;
    const now = await networkHelpers.time.latest();
    const config = directIntent(token.address, "invoice-with-installments", {
      amount: recipientTargetAmount,
      initialDeadline: BigInt(now + 60),
      feeBps: 0,
    });
    const intentAddress = await factory.read.previewAddress([config]);

    await token.write.mint([intentAddress, 400_000n]);
    await factory.write.deployAndExecute([config], {
      account: resolverOperator.account,
    });
    let cumulativeOwnerProceeds = await token.read.balanceOf([merchant.account.address]);
    assert.equal(invoiceStatus(cumulativeOwnerProceeds, recipientTargetAmount), "PARTIAL");

    // Deadlines are application metadata: late settlement remains permissionless.
    await networkHelpers.time.increaseTo(now + 120);
    await token.write.mint([intentAddress, 700_000n]);
    const intent = await viem.getContractAt("GOTIntent", intentAddress);
    await intent.write.resolve({ account: resolverOperator.account });
    cumulativeOwnerProceeds = await token.read.balanceOf([merchant.account.address]);
    assert.equal(cumulativeOwnerProceeds, 1_100_000n);
    assert.equal(invoiceStatus(cumulativeOwnerProceeds, recipientTargetAmount), "OVERPAID");
    assert.equal(await intent.read.totalProcessed(), 1_100_000n);
  });

  it("named transfers: funds before claim, settles reusable routes, and follows owner migration", async function () {
    const { token, implementation, factory } = await networkHelpers.loadFixture(deployProtocol);
    const names = await viem.deployContract("GOTName", [nameVerifier.account.address]);
    const nameKey = id("GOT_NAME_KEY_V1", "got:@alice");
    const first = directIntent(token.address, "named-transfer-a", {
      ownerSource: names.address,
      ownerKey: nameKey,
      amount: 25_000_000n,
    });
    const second = directIntent(token.address, "named-transfer-b", {
      ownerSource: names.address,
      ownerKey: nameKey,
      amount: 75_000_000n,
    });
    const firstAddress = await factory.read.previewAddress([first]);
    const secondAddress = await factory.read.previewAddress([second]);
    await token.write.mint([firstAddress, first.amount]);
    await token.write.mint([secondAddress, second.amount]);

    // Funds are safe but unprocessable until the verified name is claimed.
    await viem.assertions.revertWithCustomError(
      factory.write.deployAndExecute([first], {
        account: resolverOperator.account,
      }),
      implementation,
      "OwnerUnresolved",
    );
    const deadline = Number(await networkHelpers.time.latest()) + 3_600;
    const chainId = await publicClient.getChainId();
    const verifierSignature = await nameVerifier.signTypedData({
      account: nameVerifier.account,
      domain: {
        name: "GOTName",
        version: "1",
        chainId,
        verifyingContract: names.address,
      },
      types: {
        Claim: [
          { name: "nameKey", type: "bytes32" },
          { name: "account", type: "address" },
          { name: "deadline", type: "uint48" },
        ],
      },
      primaryType: "Claim",
      message: {
        nameKey,
        account: namedRecipient.account.address,
        deadline,
      },
    });
    await names.write.claim(
      [
        {
          nameKey,
          account: namedRecipient.account.address,
          deadline,
        },
        verifierSignature,
      ],
      { account: resolverOperator.account },
    );

    await factory.write.deployAndExecute([first], {
      account: resolverOperator.account,
    });
    await factory.write.deployAndExecute([second], {
      account: resolverOperator.account,
    });
    assert.equal(await token.read.balanceOf([namedRecipient.account.address]), 100_000_000n);

    // The current name owner—not the verifier—controls migration.
    await names.write.transfer([nameKey, migratedRecipient.account.address], {
      account: namedRecipient.account,
    });
    const afterMigration = directIntent(token.address, "named-transfer-c", {
      ownerSource: names.address,
      ownerKey: nameKey,
      amount: 50_000_000n,
    });
    const migratedAddress = await factory.read.previewAddress([afterMigration]);
    await token.write.mint([migratedAddress, afterMigration.amount]);
    await factory.write.deployAndExecute([afterMigration], {
      account: resolverOperator.account,
    });
    assert.equal(await token.read.balanceOf([migratedRecipient.account.address]), 50_000_000n);
  });

  it("got.cx SaaS dogfooding: charges a zero-fee monthly Spend Permission subscription", async function () {
    const { token, factory } = await networkHelpers.loadFixture(deployProtocol);
    const permissionManager = await viem.deployContract("MockSpendPermissionManager");
    const subscription = await viem.deployContract("GOTSubscription", [factory.address, permissionManager.address]);
    const monthlyPlanAmount = 29_000_000n; // Fixed 29 USDC hosted SaaS plan.
    const period = 30 * 24 * 60 * 60;
    const start = Number(await networkHelpers.time.latest());
    const config = directIntent(token.address, "got-cx-go-plan", {
      ownerSource: merchant.account.address, // got.cx billing treasury in this example.
      authorizedResolver: subscription.address,
      amount: monthlyPlanAmount,
      initialDeadline: BigInt(start),
      period,
      feeBps: 0,
      partner: zeroAddress,
    });
    const configHash = await factory.read.configHash([config]);
    const intentAddress = await factory.read.previewAddress([config]);
    const bindingVersion = keccak256(stringToHex("GOT_SUBSCRIPTION_BINDING_V2"));
    const extraData = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "version", type: "bytes32" },
            { name: "factory", type: "address" },
            { name: "configHash", type: "bytes32" },
            { name: "intent", type: "address" },
          ],
        },
      ],
      [
        {
          version: bindingVersion,
          factory: factory.address,
          configHash,
          intent: intentAddress,
        },
      ],
    );
    const permission = {
      account: subscriber.account.address,
      spender: subscription.address,
      token: token.address,
      allowance: monthlyPlanAmount,
      period,
      start,
      // The pinned manager requires an explicit exclusive end timestamp.
      // uint48 max represents a practically unbounded product subscription.
      end: 2 ** 48 - 1,
      salt: 1n,
      extraData,
    };

    await token.write.mint([subscriber.account.address, monthlyPlanAmount * 2n]);
    await token.write.approve([permissionManager.address, monthlyPlanAmount * 2n], { account: subscriber.account });

    // The mock accepts any non-empty approval signature; production uses Base ERC-6492 validation.
    await subscription.write.execute([permission, "0x01", config], {
      account: subscriptionKeeper.account,
    });
    assert.equal(await token.read.balanceOf([merchant.account.address]), monthlyPlanAmount);
    assert.equal(await token.read.balanceOf([subscriptionKeeper.account.address]), 0n);

    // A second full charge in the same period is rejected by the permission manager.
    await viem.assertions.revertWithCustomError(
      subscription.write.execute([permission, "0x", config], {
        account: subscriptionKeeper.account,
      }),
      permissionManager,
      "ExceededSpendPermission",
    );
    await networkHelpers.time.increase(period);
    await subscription.write.execute([permission, "0x", config], {
      account: subscriptionKeeper.account,
    });
    assert.equal(await token.read.balanceOf([merchant.account.address]), monthlyPlanAmount * 2n);
  });
});
