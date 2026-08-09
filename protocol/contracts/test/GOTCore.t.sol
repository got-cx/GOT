// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { GOTFactory } from "../core/GOTFactory.sol";
import { GOTIntent } from "../core/GOTIntent.sol";
import { IGOTFactory } from "../core/interfaces/IGOTFactory.sol";
import { IGOTIntent } from "../core/interfaces/IGOTIntent.sol";
import { GOTClones } from "../core/libraries/GOTClones.sol";
import { MockERC20, ReentrantERC20 } from "./mocks/MockERC20.sol";
import { MockOwnerResolver, NotAResolver, MalformedOwnerResolver } from "./mocks/MockOwnerResolver.sol";

contract GOTClonesHarness {
    function creationCode(address implementation, bytes memory args) external pure returns (bytes memory) {
        return GOTClones.creationCode(implementation, args);
    }
}

contract GOTCoreTest is Test {
    uint16 internal constant EXECUTION_SHARE_BPS = 2_000;
    uint16 internal constant PARTNER_SHARE_BPS = 2_500;
    uint16 internal constant MAX_FEE_BPS = 1_000;

    address internal constant TREASURY = address(0xA11CE);
    address internal constant OWNER = address(0xB0B);
    address internal constant PARTNER = address(0xCAFE);
    address internal constant RESOLVER = address(0xD00D);
    address internal constant STRANGER = address(0xBAD);

    GOTIntent internal implementation;
    GOTFactory internal factory;
    MockERC20 internal token;
    GOTClonesHarness internal cloneHarness;

    receive() external payable {}

    function setUp() public {
        implementation = new GOTIntent(TREASURY, EXECUTION_SHARE_BPS, PARTNER_SHARE_BPS);
        factory = new GOTFactory(
            address(implementation),
            TREASURY,
            EXECUTION_SHARE_BPS,
            PARTNER_SHARE_BPS,
            MAX_FEE_BPS
        );
        token = new MockERC20();
        cloneHarness = new GOTClonesHarness();
    }

    function test_ConstantsAndDirectImplementationAreLocked() public {
        assertEq(implementation.PROTOCOL_VERSION(), keccak256("GOT_PROTOCOL_V0_2"));
        assertEq(implementation.IMMUTABLE_ARGS_LENGTH(), 226);
        assertEq(factory.PROTOCOL_VERSION(), keccak256("GOT_PROTOCOL_V0_2"));
        vm.expectRevert(GOTIntent.DirectImplementationCall.selector);
        implementation.owner();
    }

    function test_FactoryRejectsMismatchedImplementationConfiguration() public {
        vm.expectRevert(GOTFactory.InvalidConfiguration.selector);
        new GOTFactory(address(implementation), TREASURY, 2_001, PARTNER_SHARE_BPS, MAX_FEE_BPS);
    }

    function test_ConfigurationValidationAndTotalProcessedOverflow() public {
        IGOTFactory.IntentConfig memory invalid = _config(OWNER, bytes32(0), 0, address(0));
        invalid.amount = 0;
        vm.expectRevert(GOTFactory.InvalidConfiguration.selector);
        factory.previewAddress(invalid);

        invalid = _config(OWNER, bytes32(0), MAX_FEE_BPS + 1, address(0));
        vm.expectRevert(GOTFactory.InvalidConfiguration.selector);
        factory.previewAddress(invalid);

        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 0, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 1);
        factory.deployAndExecute(config);
        vm.store(intent, bytes32(0), bytes32((uint256(1) << 255) - 1));
        token.mint(intent, 1);
        vm.expectRevert(GOTIntent.TotalProcessedOverflow.selector);
        IGOTIntent(intent).resolve();
    }

    function test_IntentIdFunctionSelectorCollisionsAreRejected() public {
        bytes4[3] memory selectors = [
            IGOTIntent.owner.selector,
            IGOTIntent.resolve.selector,
            IGOTIntent.recoverNative.selector
        ];

        for (uint256 i; i < selectors.length; ++i) {
            IGOTFactory.IntentConfig memory invalid = _config(OWNER, bytes32(0), 0, address(0));
            invalid.intentId = bytes32(selectors[i]);
            vm.expectRevert(GOTFactory.InvalidConfiguration.selector);
            factory.previewAddress(invalid);
        }
    }

    function test_PreviewAllowsCounterfactualTokenAndExecutionRequiresCode() public {
        IGOTFactory.IntentConfig memory config = _config(address(0x1234), bytes32(0), 0, address(0));
        config.token = address(0x1234);
        address predicted = factory.previewAddress(config);
        assertTrue(predicted != address(0));
        vm.expectRevert(GOTFactory.InvalidToken.selector);
        factory.deployAndExecute(config);
        assertEq(predicted.code.length, 0);
    }

    function test_ZeroFeeCounterfactualFundingDeploysAndPaysOwnerInFull() public {
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 0, address(0));
        address predicted = factory.previewAddress(config);
        token.mint(predicted, 1_000_000);

        vm.prank(STRANGER);
        (
            address intent,
            uint256 processed,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        ) = factory.deployAndExecute(config);

        assertEq(intent, predicted);
        assertGt(intent.code.length, 0);
        assertEq(processed, 1_000_000);
        assertEq(ownerAmount, 1_000_000);
        assertEq(treasuryFee, 0);
        assertEq(partnerReward, 0);
        assertEq(executionReward, 0);
        assertEq(token.balanceOf(OWNER), 1_000_000);
        assertEq(token.balanceOf(intent), 0);
        assertEq(IGOTIntent(intent).totalProcessed(), 1_000_000);
        _assertConfig(intent, config);
    }

    function test_PositiveFeeCanonicalSplitWithPartner() public {
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 100, PARTNER);
        address intent = factory.previewAddress(config);
        token.mint(intent, 100_000);

        vm.prank(STRANGER);
        (, , uint256 ownerAmount, uint256 treasuryFee, uint256 partnerReward, uint256 executionReward) = factory
            .deployAndExecute(config);

        assertEq(ownerAmount, 99_000);
        assertEq(executionReward, 200);
        assertEq(partnerReward, 200);
        assertEq(treasuryFee, 600);
        assertEq(token.balanceOf(OWNER), 99_000);
        assertEq(token.balanceOf(STRANGER), 200);
        assertEq(token.balanceOf(PARTNER), 200);
        assertEq(token.balanceOf(TREASURY), 600);
    }

    function test_PositiveFeeWithoutPartnerLeavesPartnerShareAtTreasury() public {
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 100, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 100_000);

        vm.prank(STRANGER);
        (, , , uint256 treasuryFee, uint256 partnerReward, uint256 executionReward) = factory.deployAndExecute(config);

        assertEq(executionReward, 200);
        assertEq(partnerReward, 0);
        assertEq(treasuryFee, 800);
    }

    function test_RestrictedResolverFailureRollsBackDeploymentAndOwnerCanAlwaysSettle() public {
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 50, PARTNER);
        config.authorizedResolver = RESOLVER;
        address intent = factory.previewAddress(config);
        token.mint(intent, 50_000);

        vm.prank(STRANGER);
        vm.expectRevert(GOTIntent.UnauthorizedResolver.selector);
        factory.deployAndExecute(config);
        assertEq(intent.code.length, 0);
        assertEq(token.balanceOf(intent), 50_000);

        vm.prank(OWNER);
        factory.deployAndExecute(config);
        assertGt(intent.code.length, 0);

        token.mint(intent, 10_000);
        vm.prank(OWNER);
        IGOTIntent(intent).settle();
        assertEq(token.balanceOf(intent), 0);
    }

    function test_CompetingResolversAndOwnerResolverOrderingAreFirstExecutionWins() public {
        IGOTFactory.IntentConfig memory open = _config(OWNER, bytes32(0), 0, address(0));
        open.intentId = keccak256("open-resolver-race");
        address openIntent = factory.previewAddress(open);
        token.mint(openIntent, 1_000);

        vm.prank(RESOLVER);
        factory.deployAndExecute(open);
        vm.prank(STRANGER);
        vm.expectRevert(GOTIntent.NoFundsAvailable.selector);
        IGOTIntent(openIntent).resolve();

        IGOTFactory.IntentConfig memory restricted = _config(OWNER, bytes32(0), 0, address(0));
        restricted.intentId = keccak256("owner-resolver-race");
        restricted.authorizedResolver = RESOLVER;
        address restrictedIntent = factory.previewAddress(restricted);
        token.mint(restrictedIntent, 1_000);

        vm.prank(OWNER);
        factory.deployAndExecute(restricted);
        vm.prank(RESOLVER);
        vm.expectRevert(GOTIntent.NoFundsAvailable.selector);
        IGOTIntent(restrictedIntent).resolve();
    }

    function test_DynamicOwnerUnresolvedThenResolvedAndMigrated() public {
        MockOwnerResolver ownerResolver = new MockOwnerResolver();
        bytes32 key = keccak256("alice");
        IGOTFactory.IntentConfig memory config = _config(address(ownerResolver), key, 0, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 1_000);

        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        factory.deployAndExecute(config);
        assertEq(intent.code.length, 0);

        ownerResolver.setOwner(OWNER);
        factory.deployAndExecute(config);
        assertEq(token.balanceOf(OWNER), 1_000);

        ownerResolver.setOwner(STRANGER);
        token.mint(intent, 500);
        vm.prank(STRANGER);
        IGOTIntent(intent).settle();
        assertEq(token.balanceOf(STRANGER), 500);
    }

    function test_ResolverFailuresAndInvalidOwnersFailClosed() public {
        bytes32 key = bytes32(uint256(1));

        NotAResolver unavailable = new NotAResolver();
        IGOTFactory.IntentConfig memory unavailableConfig = _config(address(unavailable), key, 0, address(0));
        address unavailableIntent = factory.previewAddress(unavailableConfig);
        token.mint(unavailableIntent, 1);
        vm.expectRevert(GOTIntent.InvalidOwnerResolver.selector);
        factory.deployAndExecute(unavailableConfig);

        MalformedOwnerResolver malformed = new MalformedOwnerResolver();
        IGOTFactory.IntentConfig memory malformedConfig = _config(address(malformed), key, 0, address(0));
        address malformedIntent = factory.previewAddress(malformedConfig);
        token.mint(malformedIntent, 1);
        vm.expectRevert(GOTIntent.OwnerResolutionFailed.selector);
        factory.deployAndExecute(malformedConfig);

        MockOwnerResolver resolver = new MockOwnerResolver();
        IGOTFactory.IntentConfig memory config = _config(address(resolver), key, 0, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 1);
        resolver.setOwner(address(resolver));
        vm.expectRevert(GOTIntent.InvalidResolvedOwner.selector);
        factory.deployAndExecute(config);

        resolver.setExhaustGas(true);
        vm.expectRevert(GOTIntent.OwnerResolutionFailed.selector);
        factory.deployAndExecute(config);
    }

    function test_RepeatedPartitionedFundingMatchesSingleExecution() public {
        IGOTFactory.IntentConfig memory once = _config(address(0x1001), bytes32(0), 137, PARTNER);
        IGOTFactory.IntentConfig memory split = _config(address(0x1002), bytes32(0), 137, PARTNER);
        split.intentId = keccak256("split");

        address onceIntent = factory.previewAddress(once);
        token.mint(onceIntent, 100_003);
        vm.prank(RESOLVER);
        factory.deployAndExecute(once);

        address splitIntent = factory.previewAddress(split);
        uint256[7] memory pieces = [uint256(1), 7, 99, 5_001, 31_337, 42_000, 21_558];
        for (uint256 i; i < pieces.length; ++i) {
            token.mint(splitIntent, pieces[i]);
            vm.prank(RESOLVER);
            if (i == 0) factory.deployAndExecute(split);
            else IGOTIntent(splitIntent).resolve();
        }

        assertEq(IGOTIntent(onceIntent).totalProcessed(), 100_003);
        assertEq(IGOTIntent(splitIntent).totalProcessed(), 100_003);
        assertEq(token.balanceOf(address(0x1001)), token.balanceOf(address(0x1002)));
    }

    function test_RecoveryProtectsConfiguredTokenAndRecoversOtherAssetsAndNative() public {
        IGOTFactory.IntentConfig memory config = _config(address(this), bytes32(0), 0, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 1);
        factory.deployAndExecute(config);

        MockERC20 other = new MockERC20();
        other.mint(intent, 77);
        assertEq(IGOTIntent(intent).recoverERC20(address(other)), 77);
        assertEq(other.balanceOf(address(this)), 77);

        vm.expectRevert(GOTIntent.ConfiguredTokenNotRecoverable.selector);
        IGOTIntent(intent).recoverERC20(address(token));

        vm.deal(address(this), 1 ether);
        (bool funded, ) = payable(intent).call{ value: 0.4 ether }("");
        assertTrue(funded);
        assertEq(IGOTIntent(intent).recoverNative(), 0.4 ether);
        assertEq(intent.balance, 0);
    }

    function test_UnresolvedRecoveryAlwaysUsesOwnerUnresolvedPrecedence() public {
        MockOwnerResolver ownerResolver = new MockOwnerResolver();
        ownerResolver.setOwner(OWNER);
        IGOTFactory.IntentConfig memory config = _config(address(ownerResolver), keccak256("recover"), 0, address(0));
        address intent = factory.previewAddress(config);
        token.mint(intent, 1);
        factory.deployAndExecute(config);

        MockERC20 other = new MockERC20();
        other.mint(intent, 77);
        ownerResolver.setOwner(address(0));

        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        IGOTIntent(intent).recoverERC20(address(token));
        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        IGOTIntent(intent).recoverERC20(address(0));
        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        IGOTIntent(intent).recoverERC20(address(other));
        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        IGOTIntent(intent).recoverNative();
    }

    function test_CloneArgumentLengthGuardMatchesUint16RuntimeEncoding() public view {
        uint256 maxArgsLength = type(uint16).max - 57;
        bytes memory creation = cloneHarness.creationCode(address(implementation), new bytes(maxArgsLength));
        assertEq(creation.length, 10 + uint256(type(uint16).max));
    }

    function test_CloneArgumentsOneByteOverEncodableRuntimeRevert() public {
        uint256 firstInvalidLength = type(uint16).max - 56;
        vm.expectRevert(GOTClones.CloneArgumentsTooLong.selector);
        cloneHarness.creationCode(address(implementation), new bytes(firstInvalidLength));
    }

    function test_ReentrantTokenCannotEnterProcessingTwice() public {
        ReentrantERC20 malicious = new ReentrantERC20();
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), 100, PARTNER);
        config.token = address(malicious);
        address intent = factory.previewAddress(config);
        malicious.mint(intent, 100_000);
        malicious.setCallback(intent, abi.encodeCall(IGOTIntent.resolve, ()));

        factory.deployAndExecute(config);
        assertTrue(malicious.callbackAttempted());
        assertFalse(malicious.callbackSucceeded());
        assertEq(malicious.balanceOf(intent), 0);
        assertEq(IGOTIntent(intent).totalProcessed(), 100_000);
    }

    function testFuzz_QuoteGrossProducesExactMinimum(uint128 target, uint16 fee) public view {
        fee = uint16(bound(fee, 0, 9_999));
        uint256 gross = factory.quoteGrossAmount(target, fee);
        assertEq(factory.quoteOwnerAmount(gross, fee), target);
        if (gross != 0) assertLt(factory.quoteOwnerAmount(gross - 1, fee), target);
    }

    function testFuzz_AllocationConservesGross(uint96 gross, uint16 fee) public {
        gross = uint96(bound(gross, 1, type(uint96).max));
        fee = uint16(bound(fee, 0, MAX_FEE_BPS));
        IGOTFactory.IntentConfig memory config = _config(OWNER, bytes32(0), fee, PARTNER);
        config.intentId = keccak256(abi.encode(gross, fee));
        address intent = factory.previewAddress(config);
        token.mint(intent, gross);
        (
            ,
            uint256 processed,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        ) = factory.deployAndExecute(config);
        assertEq(processed, gross);
        assertEq(ownerAmount + treasuryFee + partnerReward + executionReward, gross);
        if (fee == 0) assertEq(ownerAmount, gross);
    }

    function _config(
        address ownerSource,
        bytes32 key,
        uint16 fee,
        address partner
    ) internal view returns (IGOTFactory.IntentConfig memory config) {
        config = IGOTFactory.IntentConfig({
            intentId: keccak256("intent"),
            ownerSource: ownerSource,
            ownerKey: key,
            token: address(token),
            partner: partner,
            authorizedResolver: address(0),
            amount: 1_000,
            initialDeadline: 0,
            period: 0,
            feeBps: fee,
            metadataHash: keccak256("metadata")
        });
    }

    function _assertConfig(address intent, IGOTFactory.IntentConfig memory config) internal view {
        IGOTIntent gotIntent = IGOTIntent(intent);
        assertEq(gotIntent.intentId(), config.intentId);
        assertEq(gotIntent.ownerSource(), config.ownerSource);
        assertEq(gotIntent.ownerKey(), config.ownerKey);
        assertEq(gotIntent.token(), config.token);
        assertEq(gotIntent.partner(), config.partner);
        assertEq(gotIntent.authorizedResolver(), config.authorizedResolver);
        assertEq(gotIntent.amount(), config.amount);
        assertEq(gotIntent.initialDeadline(), config.initialDeadline);
        assertEq(gotIntent.period(), config.period);
        assertEq(gotIntent.feeBps(), config.feeBps);
        assertEq(gotIntent.metadataHash(), config.metadataHash);
        assertEq(gotIntent.factory(), address(factory));
    }
}
