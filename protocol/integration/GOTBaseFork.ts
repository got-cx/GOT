import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { deriveNameKeyV1 } from "../src/nameKeys.js";
import {
  concatHex,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  keccak256,
  padHex,
  parseAbi,
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

type SpendPermission = {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: Hex;
};

type InvoiceStatus = "OPEN" | "PARTIAL" | "SETTLED" | "OVERPAID";

const BASE_CHAIN_ID = 8453;
const PINNED_BASE_FORK_BLOCK = BigInt(process.env.BASE_FORK_BLOCK ?? "49650000");
const FORK_MODE = process.env.GOT_BASE_FORK_MODE ?? "pinned";
const USDC = getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
const SPEND_PERMISSION_MANAGER = getAddress("0xf85210B21cC50302F477BA56686d2019dC9b67Ad");
const COINBASE_SMART_WALLET_FACTORY = getAddress("0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a");
const SAFE_PROXY_FACTORY = getAddress("0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67");
const SAFE_L2_SINGLETON = getAddress("0x29fcB43b46531BcA003ddC8FCB67FFE91900C762");
const SAFE_FALLBACK_HANDLER = getAddress("0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99");
const SAFE_FALLBACK_HANDLER_SLOT = "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as Hex;
const ERC6492_MAGIC = `0x${"6492".repeat(16)}` as Hex;
const CANONICAL_CODE_HASHES = [
  [USDC, "0xa6705a10bb756b5dea144591118be77d7af0c3eee3bf2dfe2583dcb0364fefab"],
  [SPEND_PERMISSION_MANAGER, "0x2e9e272aa2f685632aae292aaf8bca67f22e4494ec831959bc6e9ff071378bea"],
  [COINBASE_SMART_WALLET_FACTORY, "0xc4900c000fd23885462a115b872741ad2b1e7ff2d7889aee18bc4d4bef3728f6"],
  [SAFE_PROXY_FACTORY, "0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317"],
  [SAFE_L2_SINGLETON, "0xb1f926978a0f44a2c0ec8fe822418ae969bd8c3f18d61e5103100339894f81ff"],
  [SAFE_FALLBACK_HANDLER, "0x7c6007a5d711cea8dfd5d91f5940ec29c7f200fe511eb1fc1397b367af3c42f9"],
] as const satisfies ReadonlyArray<readonly [Address, Hex]>;

const ZERO_KEY = `0x${"00".repeat(32)}` as Hex;
const id = (namespace: string, record: string) =>
  keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "string" }], [keccak256(stringToHex(namespace)), record]),
  );

function invoiceStatus(ownerProceeds: bigint, target: bigint): InvoiceStatus {
  if (ownerProceeds === 0n) return "OPEN";
  if (ownerProceeds < target) return "PARTIAL";
  if (ownerProceeds === target) return "SETTLED";
  return "OVERPAID";
}

const usdcAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function masterMinter() view returns (address)",
  "function blacklister() view returns (address)",
  "function isBlacklisted(address account) view returns (bool)",
  "function blacklist(address account)",
  "function unBlacklist(address account)",
  "function configureMinter(address minter, uint256 minterAllowedAmount) returns (bool)",
  "function mint(address to, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const coinbaseFactoryAbi = parseAbi([
  "function createAccount(bytes[] owners, uint256 nonce) returns (address account)",
  "function getAddress(bytes[] owners, uint256 nonce) view returns (address account)",
]);

const managerAbi = parseAbi([
  "function getHash((address account,address spender,address token,uint160 allowance,uint48 period,uint48 start,uint48 end,uint256 salt,bytes extraData) spendPermission) view returns (bytes32)",
  "function isApproved((address account,address spender,address token,uint160 allowance,uint48 period,uint48 start,uint48 end,uint256 salt,bytes extraData) spendPermission) view returns (bool)",
  "function isRevoked((address account,address spender,address token,uint160 allowance,uint48 period,uint48 start,uint48 end,uint256 salt,bytes extraData) spendPermission) view returns (bool)",
  "function revoke((address account,address spender,address token,uint160 allowance,uint48 period,uint48 start,uint48 end,uint256 salt,bytes extraData) spendPermission)",
]);

const coinbaseSmartWalletAbi = parseAbi(["function execute(address target, uint256 value, bytes data)"]);

const safeFactoryAbi = parseAbi([
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
]);

const safeAbi = parseAbi([
  "function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address payable paymentReceiver)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
  "function approveHash(bytes32 hashToApprove)",
  "function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address payable refundReceiver,bytes signatures) returns (bool success)",
  "function swapOwner(address prevOwner,address oldOwner,address newOwner)",
]);

describe("GOT production profile on a Base mainnet fork", async function () {
  const { viem, networkHelpers } = await network.create();
  const [
    deployer,
    treasury,
    merchant,
    partner,
    payer,
    resolver,
    subscriberOwner,
    safeOwnerA,
    safeOwnerB,
    safeOwnerC,
    rotatedSafeOwner,
    namedRecipient,
    migratedRecipient,
    blockedPartner,
    alternateResolver,
  ] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const forkOriginBlock = await publicClient.getBlockNumber();
  const forkOriginHash = (await publicClient.getBlock({ blockNumber: forkOriginBlock })).hash;

  function forkStateNonce(label: string, attempt = 0): bigint {
    return BigInt(
      keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "string" }, { type: "uint256" }],
          [forkOriginHash, label, BigInt(attempt)],
        ),
      ),
    );
  }

  async function assertCanonicalBaseContracts() {
    assert.equal(await publicClient.getChainId(), BASE_CHAIN_ID);
    if (FORK_MODE === "pinned") {
      assert.equal(forkOriginBlock, PINNED_BASE_FORK_BLOCK, "release fork must start at the pinned Base block");
    } else {
      assert.ok(forkOriginBlock >= PINNED_BASE_FORK_BLOCK, "tip fork predates the release baseline");
    }
    for (const [address, expectedCodeHash] of CANONICAL_CODE_HASHES) {
      const code = await publicClient.getCode({ address });
      assert.notEqual(code, undefined, `missing canonical Base contract ${address}`);
      assert.equal(keccak256(code as Hex), expectedCodeHash, `unexpected runtime code at ${address}`);
    }
  }

  async function mintCanonicalUsdc(to: Address, amount: bigint) {
    const masterMinter = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "masterMinter",
    });
    await networkHelpers.impersonateAccount(masterMinter);
    await networkHelpers.setBalance(masterMinter, 10n ** 18n);
    const masterMinterClient = await viem.getWalletClient(masterMinter);
    await masterMinterClient.writeContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "configureMinter",
      args: [deployer.account.address, amount],
    });
    await networkHelpers.stopImpersonatingAccount(masterMinter);
    await deployer.writeContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "mint",
      args: [to, amount],
    });
  }

  async function setCanonicalUsdcBlacklist(account: Address, blocked: boolean) {
    const blacklister = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "blacklister",
    });
    await networkHelpers.impersonateAccount(blacklister);
    await networkHelpers.setBalance(blacklister, 10n ** 18n);
    const blacklisterClient = await viem.getWalletClient(blacklister);
    if (blocked) {
      await blacklisterClient.writeContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "blacklist",
        args: [account],
      });
    } else {
      await blacklisterClient.writeContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "unBlacklist",
        args: [account],
      });
    }
    await networkHelpers.stopImpersonatingAccount(blacklister);
    assert.equal(
      await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "isBlacklisted",
        args: [account],
      }),
      blocked,
    );
  }

  async function deployProtocol() {
    const implementation = await viem.deployContract("GOTIntent", [treasury.account.address, 2_000, 3_750]);
    const factory = await viem.deployContract("GOTFactory", [
      implementation.address,
      treasury.account.address,
      2_000,
      3_750,
      1_000,
    ]);
    return { implementation, factory };
  }

  function directIntent(record: string, overrides: Partial<IntentConfig> = {}): IntentConfig {
    return {
      intentId: id("GOT_APPLICATION_INTENT_V2", record),
      ownerSource: merchant.account.address,
      ownerKey: ZERO_KEY,
      token: USDC,
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

  async function deployThresholdSafe(): Promise<Address> {
    const owners = [safeOwnerA.account.address, safeOwnerB.account.address, safeOwnerC.account.address].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    const initializer = encodeFunctionData({
      abi: safeAbi,
      functionName: "setup",
      args: [owners, 2n, zeroAddress, "0x", SAFE_FALLBACK_HANDLER, zeroAddress, 0n, zeroAddress],
    });
    async function simulateUnusedSafeDeployment() {
      for (let attempt = 0; attempt < 32; attempt++) {
        try {
          const deployment = await publicClient.simulateContract({
            account: deployer.account,
            address: SAFE_PROXY_FACTORY,
            abi: safeFactoryAbi,
            functionName: "createProxyWithNonce",
            args: [SAFE_L2_SINGLETON, initializer, forkStateNonce("got-safe-verifier-v1", attempt)],
          });
          if ((await publicClient.getCode({ address: deployment.result })) === undefined) return deployment;
        } catch {
          // A CREATE2 collision is possible on evolving fork state; try the next derived nonce.
        }
      }
      throw new Error("could not derive an unused Safe CREATE2 nonce from fork state");
    }
    const { request, result } = await simulateUnusedSafeDeployment();
    assert.equal(await publicClient.getCode({ address: result }), undefined);
    await deployer.writeContract(request);
    assert.equal(await publicClient.readContract({ address: result, abi: safeAbi, functionName: "getThreshold" }), 2n);
    assert.deepEqual(
      (await publicClient.readContract({ address: result, abi: safeAbi, functionName: "getOwners" }))
        .map((owner) => getAddress(owner))
        .toSorted(),
      owners.map((owner) => getAddress(owner)).toSorted(),
    );
    const fallbackHandlerStorage = await publicClient.getStorageAt({
      address: result,
      slot: SAFE_FALLBACK_HANDLER_SLOT,
    });
    assert.notEqual(fallbackHandlerStorage, undefined);
    assert.equal(getAddress(`0x${fallbackHandlerStorage!.slice(-40)}`), SAFE_FALLBACK_HANDLER);
    return result;
  }

  it("settles the production checkout, invoice, and threshold-Safe name workflows with USDC", async function () {
    await assertCanonicalBaseContracts();
    const { implementation, factory } = await deployProtocol();
    for (const signature of ["owner()", "resolve()", "recoverNative()"]) {
      const selector = toFunctionSelector(signature);
      await viem.assertions.revertWithCustomError(
        factory.read.previewAddress([
          directIntent(`base-fork-selector-${signature}`, {
            intentId: `${selector}${"00".repeat(28)}` as Hex,
          }),
        ]),
        factory,
        "InvalidConfiguration",
      );
    }
    const transferAmount = 250_000_000n;
    const direct = directIntent("base-fork-transfer", { amount: transferAmount });
    const intentAddress = await factory.read.previewAddress([direct]);
    const merchantBeforeTransfer = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });

    assert.equal(await publicClient.getCode({ address: intentAddress }), undefined);
    await mintCanonicalUsdc(payer.account.address, transferAmount);
    await payer.writeContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "transfer",
      args: [intentAddress, transferAmount],
    });
    await factory.write.deployAndExecute([direct], { account: resolver.account });
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [merchant.account.address],
      })) - merchantBeforeTransfer,
      transferAmount,
    );
    assert.notEqual(await publicClient.getCode({ address: intentAddress }), undefined);
    const checkoutIntent = await viem.getContractAt("GOTIntent", intentAddress);
    await viem.assertions.revertWithCustomError(
      checkoutIntent.write.resolve({ account: resolver.account }),
      checkoutIntent,
      "NoFundsAvailable",
    );
    assert.equal(await checkoutIntent.read.totalProcessed(), transferAmount);
    assert.equal(
      await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [intentAddress],
      }),
      0n,
    );

    const recipientTargetAmount = 100_000_000n;
    const feeBps = 30;
    const grossQuotedAmount = await factory.read.quoteGrossAmount([recipientTargetAmount, feeBps]);
    assert.equal(await factory.read.quoteOwnerAmount([grossQuotedAmount, feeBps]), recipientTargetAmount);
    assert.ok((await factory.read.quoteOwnerAmount([grossQuotedAmount - 1n, feeBps])) < recipientTargetAmount);
    const feeConfig = directIntent("base-fork-partner-invoice", {
      amount: grossQuotedAmount,
      partner: partner.account.address,
      feeBps,
    });
    const feeIntent = await factory.read.previewAddress([feeConfig]);
    const merchantBeforeFee = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });
    const partnerBeforeFee = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [partner.account.address],
    });
    const treasuryBeforeFee = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [treasury.account.address],
    });
    const resolverBeforeFee = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [resolver.account.address],
    });
    await mintCanonicalUsdc(feeIntent, grossQuotedAmount);
    await factory.write.deployAndExecute([feeConfig], { account: resolver.account });
    const totalFee = grossQuotedAmount - recipientTargetAmount;
    const executionReward = (totalFee * 2_000n) / 10_000n;
    const nonExecutionFee = totalFee - executionReward;
    const partnerReward = (nonExecutionFee * 3_750n) / 10_000n;
    const treasuryFee = nonExecutionFee - partnerReward;
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [merchant.account.address],
      })) - merchantBeforeFee,
      recipientTargetAmount,
    );
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [partner.account.address],
      })) - partnerBeforeFee,
      partnerReward,
    );
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [treasury.account.address],
      })) - treasuryBeforeFee,
      treasuryFee,
    );
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [resolver.account.address],
      })) - resolverBeforeFee,
      executionReward,
    );

    const now = await networkHelpers.time.latest();
    const installmentConfig = directIntent("base-fork-installments", {
      amount: 1_000_000n,
      initialDeadline: BigInt(now + 60),
    });
    const installmentIntentAddress = await factory.read.previewAddress([installmentConfig]);
    const merchantBeforeInstallments = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });
    assert.equal(invoiceStatus(0n, installmentConfig.amount), "OPEN");
    await mintCanonicalUsdc(installmentIntentAddress, 400_000n);
    await factory.write.deployAndExecute([installmentConfig], { account: resolver.account });
    let installmentProceeds =
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [merchant.account.address],
      })) - merchantBeforeInstallments;
    assert.equal(invoiceStatus(installmentProceeds, installmentConfig.amount), "PARTIAL");
    await networkHelpers.time.increaseTo(now + 120);
    await mintCanonicalUsdc(installmentIntentAddress, 700_000n);
    const installmentIntent = await viem.getContractAt("GOTIntent", installmentIntentAddress);
    await installmentIntent.write.resolve({ account: resolver.account });
    assert.equal(await installmentIntent.read.totalProcessed(), 1_100_000n);
    installmentProceeds =
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [merchant.account.address],
      })) - merchantBeforeInstallments;
    assert.equal(invoiceStatus(installmentProceeds, installmentConfig.amount), "OVERPAID");

    const safe = await deployThresholdSafe();
    const safeOwnerConfig = directIntent("base-fork-safe-owner", {
      ownerSource: safe,
      amount: 5_000_000n,
    });
    const safeOwnerIntent = await factory.read.previewAddress([safeOwnerConfig]);
    const safeBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [safe],
    });
    await mintCanonicalUsdc(safeOwnerIntent, safeOwnerConfig.amount);
    await factory.write.deployAndExecute([safeOwnerConfig], { account: resolver.account });
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [safe],
      })) - safeBalanceBefore,
      safeOwnerConfig.amount,
    );

    const names = await viem.deployContract("GOTName", [safe]);
    const nameKey = deriveNameKeyV1("got", "@base-fork");
    assert.equal(await names.read.deriveNameKey(["got:base-fork"]), nameKey);
    const deadline = Number(await networkHelpers.time.latest()) + 3_600;
    const claim = { nameKey, account: namedRecipient.account.address, deadline };
    const domain = { name: "GOTName", version: "1", chainId: BASE_CHAIN_ID, verifyingContract: names.address } as const;
    const types = {
      Claim: [
        { name: "nameKey", type: "bytes32" },
        { name: "account", type: "address" },
        { name: "deadline", type: "uint48" },
      ],
    } as const;
    const claimDigest = hashTypedData({ domain, types, primaryType: "Claim", message: claim });
    const safeMessage = encodeAbiParameters([{ type: "bytes32" }], [claimDigest]);
    async function signSafeMessage(
      message: Hex,
      signers = [safeOwnerA, safeOwnerB] as Array<typeof safeOwnerA>,
      sortSignatures = true,
    ) {
      const individual = await Promise.all(
        signers.map(async (owner) => ({
          address: owner.account.address,
          signature: await owner.signTypedData({
            account: owner.account,
            domain: { chainId: BASE_CHAIN_ID, verifyingContract: safe },
            types: { SafeMessage: [{ name: "message", type: "bytes" }] },
            primaryType: "SafeMessage",
            message: { message },
          }),
        })),
      );
      return {
        individual,
        combined: concatHex(
          (sortSignatures
            ? individual.toSorted((a, b) => a.address.toLowerCase().localeCompare(b.address.toLowerCase()))
            : individual
          ).map(({ signature }) => signature),
        ),
      };
    }

    const validSafeSignatures = await signSafeMessage(safeMessage);
    const verifierSignature = validSafeSignatures.combined;
    const namedConfig = directIntent("base-fork-named-transfer", {
      ownerSource: names.address,
      ownerKey: nameKey,
      amount: 25_000_000n,
    });
    const namedIntent = await factory.read.previewAddress([namedConfig]);
    await mintCanonicalUsdc(namedIntent, namedConfig.amount);
    await viem.assertions.revertWithCustomError(
      factory.write.deployAndExecute([namedConfig], { account: resolver.account }),
      implementation,
      "OwnerUnresolved",
    );
    await viem.assertions.revertWithCustomError(
      names.write.claim([claim, validSafeSignatures.individual[0].signature]),
      names,
      "InvalidVerifierSignature",
    );
    const wrongDomainDigest = hashTypedData({
      domain: { ...domain, chainId: BASE_CHAIN_ID + 1 },
      types,
      primaryType: "Claim",
      message: claim,
    });
    const wrongDomainSignatures = await signSafeMessage(
      encodeAbiParameters([{ type: "bytes32" }], [wrongDomainDigest]),
    );
    await viem.assertions.revertWithCustomError(
      names.write.claim([claim, wrongDomainSignatures.combined]),
      names,
      "InvalidVerifierSignature",
    );

    const unorderedClaim = {
      nameKey: deriveNameKeyV1("got", "@unordered-signatures"),
      account: namedRecipient.account.address,
      deadline,
    };
    const unorderedDigest = hashTypedData({ domain, types, primaryType: "Claim", message: unorderedClaim });
    const unorderedSignatures = await signSafeMessage(encodeAbiParameters([{ type: "bytes32" }], [unorderedDigest]));
    const orderedSignatures = unorderedSignatures.individual.toSorted((a, b) =>
      a.address.toLowerCase().localeCompare(b.address.toLowerCase()),
    );
    await viem.assertions.revertWithCustomError(
      names.write.claim([unorderedClaim, concatHex(orderedSignatures.toReversed().map(({ signature }) => signature))]),
      names,
      "InvalidVerifierSignature",
    );

    for (const [label, pair] of [
      ["a-c", [safeOwnerA, safeOwnerC]],
      ["b-c", [safeOwnerB, safeOwnerC]],
    ] as const) {
      const pairClaim = {
        nameKey: deriveNameKeyV1("got", `@safe-pair-${label}`),
        account: namedRecipient.account.address,
        deadline,
      };
      const pairDigest = hashTypedData({ domain, types, primaryType: "Claim", message: pairClaim });
      const pairSignatures = await signSafeMessage(encodeAbiParameters([{ type: "bytes32" }], [pairDigest]), [...pair]);
      await names.write.claim([pairClaim, pairSignatures.combined]);
      assert.equal(
        getAddress(await names.read.accountOf([pairClaim.nameKey])),
        getAddress(namedRecipient.account.address),
      );
    }

    await names.write.claim([claim, verifierSignature]);
    assert.equal(getAddress(await names.read.accountOf([nameKey])), getAddress(namedRecipient.account.address));
    await viem.assertions.revertWithCustomError(names.write.claim([claim, verifierSignature]), names, "AlreadyClaimed");
    await viem.assertions.revertWithCustomError(
      names.write.claim(
        [
          {
            nameKey: deriveNameKeyV1("got", "@expired-claim"),
            account: namedRecipient.account.address,
            deadline: Number(await networkHelpers.time.latest()) - 1,
          },
          "0x",
        ],
        { account: resolver.account },
      ),
      names,
      "ClaimExpired",
    );

    const currentSafeOwners = await publicClient.readContract({
      address: safe,
      abi: safeAbi,
      functionName: "getOwners",
    });
    const oldOwner = getAddress(safeOwnerC.account.address);
    const oldOwnerIndex = currentSafeOwners.map((owner) => getAddress(owner)).indexOf(oldOwner);
    assert.notEqual(oldOwnerIndex, -1);
    const sentinelOwner = getAddress("0x0000000000000000000000000000000000000001");
    const previousOwner = oldOwnerIndex === 0 ? sentinelOwner : getAddress(currentSafeOwners[oldOwnerIndex - 1]);
    const rotationData = encodeFunctionData({
      abi: safeAbi,
      functionName: "swapOwner",
      args: [previousOwner, oldOwner, rotatedSafeOwner.account.address],
    });
    const safeNonce = await publicClient.readContract({ address: safe, abi: safeAbi, functionName: "nonce" });
    const rotationHash = await publicClient.readContract({
      address: safe,
      abi: safeAbi,
      functionName: "getTransactionHash",
      args: [safe, 0n, rotationData, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, safeNonce],
    });
    for (const owner of [safeOwnerA, safeOwnerB]) {
      await owner.writeContract({
        address: safe,
        abi: safeAbi,
        functionName: "approveHash",
        args: [rotationHash],
      });
    }
    const approvedHashSignatures = concatHex(
      [safeOwnerA.account.address, safeOwnerB.account.address]
        .toSorted((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map((owner) => concatHex([padHex(owner, { size: 32 }), ZERO_KEY, "0x01"])),
    );
    await deployer.writeContract({
      address: safe,
      abi: safeAbi,
      functionName: "execTransaction",
      args: [safe, 0n, rotationData, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, approvedHashSignatures],
    });
    const rotatedOwners = (
      await publicClient.readContract({ address: safe, abi: safeAbi, functionName: "getOwners" })
    ).map((owner) => getAddress(owner));
    assert.equal(rotatedOwners.includes(oldOwner), false);
    assert.equal(rotatedOwners.includes(getAddress(rotatedSafeOwner.account.address)), true);

    const postRotationClaim = {
      nameKey: deriveNameKeyV1("got", "@post-rotation"),
      account: migratedRecipient.account.address,
      deadline,
    };
    const postRotationDigest = hashTypedData({ domain, types, primaryType: "Claim", message: postRotationClaim });
    const postRotationSignatures = await signSafeMessage(
      encodeAbiParameters([{ type: "bytes32" }], [postRotationDigest]),
      [safeOwnerA, rotatedSafeOwner],
    );
    await names.write.claim([postRotationClaim, postRotationSignatures.combined]);
    const namedRecipientBefore = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [namedRecipient.account.address],
    });
    await factory.write.deployAndExecute([namedConfig], { account: resolver.account });
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [namedRecipient.account.address],
      })) - namedRecipientBefore,
      namedConfig.amount,
    );

    await names.write.transfer([nameKey, migratedRecipient.account.address], { account: namedRecipient.account });
    const migratedConfig = directIntent("base-fork-migrated-name", {
      ownerSource: names.address,
      ownerKey: nameKey,
      amount: 50_000_000n,
    });
    const migratedIntent = await factory.read.previewAddress([migratedConfig]);
    const migratedRecipientBefore = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [migratedRecipient.account.address],
    });
    await mintCanonicalUsdc(migratedIntent, migratedConfig.amount);
    await factory.write.deployAndExecute([migratedConfig], { account: resolver.account });
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [migratedRecipient.account.address],
      })) - migratedRecipientBefore,
      migratedConfig.amount,
    );
  });

  it("enforces ERC-6492 approval, periods, failures, and cancellation with the real permission manager", async function () {
    await assertCanonicalBaseContracts();
    const { factory } = await deployProtocol();
    const owners = [
      encodeAbiParameters([{ type: "address" }], [subscriberOwner.account.address]),
      encodeAbiParameters([{ type: "address" }], [SPEND_PERMISSION_MANAGER]),
    ];
    let smartWalletNonce = forkStateNonce("got-coinbase-smart-wallet-v1");
    let smartWallet = await publicClient.readContract({
      address: COINBASE_SMART_WALLET_FACTORY,
      abi: coinbaseFactoryAbi,
      functionName: "getAddress",
      args: [owners, smartWalletNonce],
    });
    for (let attempt = 1; (await publicClient.getCode({ address: smartWallet })) !== undefined; attempt++) {
      assert.ok(attempt < 32, "could not derive an unused Coinbase Smart Wallet nonce from fork state");
      smartWalletNonce = forkStateNonce("got-coinbase-smart-wallet-v1", attempt);
      smartWallet = await publicClient.readContract({
        address: COINBASE_SMART_WALLET_FACTORY,
        abi: coinbaseFactoryAbi,
        functionName: "getAddress",
        args: [owners, smartWalletNonce],
      });
    }
    assert.equal(await publicClient.getCode({ address: smartWallet }), undefined);

    const counterfactualOwnerConfig = directIntent("base-fork-counterfactual-smart-wallet-owner", {
      ownerSource: smartWallet,
      amount: 1_000_000n,
    });
    const counterfactualOwnerIntent = await factory.read.previewAddress([counterfactualOwnerConfig]);
    const smartWalletBeforeDirectSettlement = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [smartWallet],
    });
    await mintCanonicalUsdc(counterfactualOwnerIntent, counterfactualOwnerConfig.amount);
    await factory.write.deployAndExecute([counterfactualOwnerConfig], { account: resolver.account });
    assert.equal(await publicClient.getCode({ address: smartWallet }), undefined);
    assert.equal(
      (await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [smartWallet],
      })) - smartWalletBeforeDirectSettlement,
      counterfactualOwnerConfig.amount,
    );

    const subscription = await viem.deployContract("GOTSubscription", [factory.address, SPEND_PERMISSION_MANAGER]);
    const amount = 29_000_000n;
    const period = 30 * 24 * 60 * 60;
    const start = Number(await networkHelpers.time.latest());
    const config = directIntent("base-fork-subscription", {
      ownerSource: merchant.account.address,
      authorizedResolver: subscription.address,
      amount,
      initialDeadline: BigInt(start),
      period,
    });

    async function permissionFor(
      permissionConfig: IntentConfig,
      salt: bigint,
      end = 2 ** 48 - 1,
    ): Promise<SpendPermission> {
      const configHash = await factory.read.configHash([permissionConfig]);
      const intent = await factory.read.previewAddress([permissionConfig]);
      return {
        account: smartWallet,
        spender: subscription.address,
        token: USDC,
        allowance: permissionConfig.amount,
        period: permissionConfig.period,
        start: Number(permissionConfig.initialDeadline),
        end,
        salt,
        extraData: encodeAbiParameters(
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
              version: keccak256(stringToHex("GOT_SUBSCRIPTION_BINDING_V2")),
              factory: factory.address,
              configHash,
              intent,
            },
          ],
        ),
      };
    }

    async function signPermission(permission: SpendPermission): Promise<Hex> {
      const permissionHash = await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "getHash",
        args: [permission],
      });
      const ownerSignature = await subscriberOwner.signTypedData({
        account: subscriberOwner.account,
        domain: {
          name: "Coinbase Smart Wallet",
          version: "1",
          chainId: BASE_CHAIN_ID,
          verifyingContract: smartWallet,
        },
        types: { CoinbaseSmartWalletMessage: [{ name: "hash", type: "bytes32" }] },
        primaryType: "CoinbaseSmartWalletMessage",
        message: { hash: permissionHash },
      });
      return encodeAbiParameters(
        [
          {
            type: "tuple",
            components: [
              { name: "ownerIndex", type: "uint256" },
              { name: "signatureData", type: "bytes" },
            ],
          },
        ],
        [{ ownerIndex: 0n, signatureData: ownerSignature }],
      );
    }

    async function economicBalances(intent: Address) {
      return await Promise.all(
        [merchant.account.address, smartWallet, subscription.address, intent].map(async (address) =>
          publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [address] }),
        ),
      );
    }

    const permission = await permissionFor(config, 1n);
    const intent = await factory.read.previewAddress([config]);
    const merchantBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });
    await mintCanonicalUsdc(smartWallet, amount * 2n);
    const wrappedSignature = await signPermission(permission);
    const factoryCallData = encodeFunctionData({
      abi: coinbaseFactoryAbi,
      functionName: "createAccount",
      args: [owners, smartWalletNonce],
    });
    const erc6492Signature = concatHex([
      encodeAbiParameters(
        [{ type: "address" }, { type: "bytes" }, { type: "bytes" }],
        [COINBASE_SMART_WALLET_FACTORY, factoryCallData, wrappedSignature],
      ),
      ERC6492_MAGIC,
    ]);

    await subscription.write.execute([permission, erc6492Signature, config], { account: resolver.account });
    assert.notEqual(await publicClient.getCode({ address: smartWallet }), undefined);
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isApproved",
        args: [permission],
      }),
      true,
    );

    let balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(subscription.write.execute([permission, "0x", config], { account: resolver.account }));
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);

    await networkHelpers.time.increase(period);
    await subscription.write.execute([permission, "0x", config], { account: resolver.account });
    let merchantBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });
    assert.equal(merchantBalanceAfter - merchantBalanceBefore, amount * 2n);

    await networkHelpers.time.increase(period);
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(subscription.write.execute([permission, "0x", config], { account: resolver.account }));
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);

    await mintCanonicalUsdc(smartWallet, amount);
    const invalidSignaturePermission = await permissionFor(config, 2n);
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(
      subscription.write.execute([invalidSignaturePermission, wrappedSignature, config], { account: resolver.account }),
    );
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isApproved",
        args: [invalidSignaturePermission],
      }),
      false,
    );

    const currentTime = await networkHelpers.time.latest();
    const expiredPermission = await permissionFor(config, 3n, currentTime - 1);
    const expiredSignature = await signPermission(expiredPermission);
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(
      subscription.write.execute([expiredPermission, expiredSignature, config], { account: resolver.account }),
    );
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isApproved",
        args: [expiredPermission],
      }),
      false,
    );

    const zeroEndPermission = { ...permission, salt: 4n, end: 0 };
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(subscription.write.execute([zeroEndPermission, "0x", config], { account: resolver.account }));
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isApproved",
        args: [zeroEndPermission],
      }),
      false,
    );

    const malformedBindingPermission = { ...permission, salt: 5n, extraData: "0x" as Hex };
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(
      subscription.write.execute([malformedBindingPermission, "0x", config], { account: resolver.account }),
    );
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);

    const revokeData = encodeFunctionData({
      abi: managerAbi,
      functionName: "revoke",
      args: [permission],
    });
    await subscriberOwner.writeContract({
      address: smartWallet,
      abi: coinbaseSmartWalletAbi,
      functionName: "execute",
      args: [SPEND_PERMISSION_MANAGER, 0n, revokeData],
    });
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isRevoked",
        args: [permission],
      }),
      true,
    );
    balancesBeforeFailure = await economicBalances(intent);
    await assert.rejects(subscription.write.execute([permission, "0x", config], { account: resolver.account }));
    assert.deepEqual(await economicBalances(intent), balancesBeforeFailure);

    const unresolvedNames = await viem.deployContract("GOTName", [subscriberOwner.account.address]);
    const unresolvedStart = await networkHelpers.time.latest();
    const unresolvedConfig = directIntent("base-fork-unresolved-subscription", {
      ownerSource: unresolvedNames.address,
      ownerKey: deriveNameKeyV1("got", "@unresolved-subscription"),
      authorizedResolver: subscription.address,
      amount,
      initialDeadline: BigInt(unresolvedStart),
      period,
    });
    const unresolvedPermission = await permissionFor(unresolvedConfig, 6n);
    const unresolvedSignature = await signPermission(unresolvedPermission);
    const unresolvedIntent = await factory.read.previewAddress([unresolvedConfig]);
    balancesBeforeFailure = await economicBalances(unresolvedIntent);
    await assert.rejects(
      subscription.write.execute([unresolvedPermission, unresolvedSignature, unresolvedConfig], {
        account: resolver.account,
      }),
    );
    assert.deepEqual(await economicBalances(unresolvedIntent), balancesBeforeFailure);
    assert.equal(await publicClient.getCode({ address: unresolvedIntent }), undefined);
    assert.equal(
      await publicClient.readContract({
        address: SPEND_PERMISSION_MANAGER,
        abi: managerAbi,
        functionName: "isApproved",
        args: [unresolvedPermission],
      }),
      false,
    );

    merchantBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [merchant.account.address],
    });
    assert.equal(merchantBalanceAfter - merchantBalanceBefore, amount * 2n);
  });

  it("reproduces canonical USDC blocklist liveness dependencies for positive-fee intents", async function () {
    await assertCanonicalBaseContracts();
    const { factory } = await deployProtocol();
    const grossAmount = 1_000_000n;

    async function fund(config: IntentConfig) {
      const intent = await factory.read.previewAddress([config]);
      await mintCanonicalUsdc(intent, grossAmount);
      return intent;
    }

    async function assertFundedAndUndeployed(intent: Address) {
      assert.equal(await publicClient.getCode({ address: intent }), undefined);
      assert.equal(
        await publicClient.readContract({
          address: USDC,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [intent],
        }),
        grossAmount,
      );
    }

    const partnerConfig = directIntent("base-fork-blocklisted-partner", {
      amount: grossAmount,
      partner: blockedPartner.account.address,
      feeBps: 100,
    });
    const partnerIntent = await fund(partnerConfig);
    await setCanonicalUsdcBlacklist(blockedPartner.account.address, true);
    await assert.rejects(factory.write.deployAndExecute([partnerConfig], { account: resolver.account }));
    await assertFundedAndUndeployed(partnerIntent);
    await setCanonicalUsdcBlacklist(blockedPartner.account.address, false);
    await factory.write.deployAndExecute([partnerConfig], { account: resolver.account });

    const treasuryConfig = directIntent("base-fork-blocklisted-treasury", {
      amount: grossAmount,
      feeBps: 100,
    });
    const treasuryIntent = await fund(treasuryConfig);
    await setCanonicalUsdcBlacklist(treasury.account.address, true);
    await assert.rejects(factory.write.deployAndExecute([treasuryConfig], { account: resolver.account }));
    await assertFundedAndUndeployed(treasuryIntent);
    await setCanonicalUsdcBlacklist(treasury.account.address, false);
    await factory.write.deployAndExecute([treasuryConfig], { account: resolver.account });

    const executorConfig = directIntent("base-fork-blocklisted-open-executor", {
      amount: grossAmount,
      feeBps: 100,
    });
    const executorIntent = await fund(executorConfig);
    await setCanonicalUsdcBlacklist(resolver.account.address, true);
    await assert.rejects(factory.write.deployAndExecute([executorConfig], { account: resolver.account }));
    await assertFundedAndUndeployed(executorIntent);
    await factory.write.deployAndExecute([executorConfig], { account: alternateResolver.account });
    assert.equal(
      await publicClient.readContract({
        address: USDC,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [executorIntent],
      }),
      0n,
    );
    await setCanonicalUsdcBlacklist(resolver.account.address, false);
  });
});
