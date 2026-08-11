// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { Test } from "forge-std/Test.sol";
import { GOTIntent } from "../core/GOTIntent.sol";
import { GOTFactory } from "../core/GOTFactory.sol";
import { GOTSubscription } from "../periphery/GOTSubscription.sol";
import { IGOTFactory } from "../core/interfaces/IGOTFactory.sol";
import { ISpendPermissionManager } from "../periphery/interfaces/ISpendPermissionManager.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockSpendPermissionManager } from "./mocks/MockSpendPermissionManager.sol";
import { MockOwnerResolver } from "./mocks/MockOwnerResolver.sol";

contract GOTSubscriptionTest is Test {
    address internal constant TREASURY = address(0x111);
    address internal constant SUBSCRIBER = address(0x222);
    address internal constant MERCHANT = address(0x333);
    address internal constant PARTNER = address(0x444);
    address internal constant KEEPER = address(0x555);

    GOTIntent internal implementation;
    GOTFactory internal factory;
    GOTSubscription internal subscription;
    MockSpendPermissionManager internal permissionManager;
    MockERC20 internal token;

    function setUp() public {
        token = new MockERC20();
        permissionManager = new MockSpendPermissionManager();
        implementation = new GOTIntent(TREASURY, 2_000, 3_750);
        factory = new GOTFactory(address(implementation), TREASURY, 2_000, 3_750, 1_000);
        subscription = new GOTSubscription(address(factory), address(permissionManager));
        token.mint(SUBSCRIBER, 1_000_000);
        vm.prank(SUBSCRIBER);
        token.approve(address(permissionManager), type(uint256).max);
    }

    function test_ApprovalBySignatureZeroFeeChargeAndSecondPeriodLimit() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 0);

        vm.prank(KEEPER);
        (address intent, uint256 processed, uint256 ownerAmount, , , ) = subscription.execute(
            permission,
            hex"01",
            config
        );
        assertEq(processed, config.amount);
        assertEq(ownerAmount, config.amount);
        assertEq(token.balanceOf(MERCHANT), config.amount);
        assertEq(token.balanceOf(address(subscription)), 0);
        assertGt(intent.code.length, 0);

        vm.prank(KEEPER);
        vm.expectRevert(
            abi.encodeWithSelector(MockSpendPermissionManager.ExceededSpendPermission.selector, 2_000, 1_000)
        );
        subscription.execute(permission, "", config);
    }

    function test_ExistingApprovalPositiveFeeForwardsRewardToKeeper() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 100);
        config.partner = PARTNER;
        permission = _permissionFor(config);

        vm.prank(SUBSCRIBER);
        permissionManager.approve(permission);
        vm.prank(KEEPER);
        (, , uint256 ownerAmount, uint256 treasuryFee, uint256 partnerReward, uint256 executionReward) = subscription
            .execute(permission, "", config);

        assertEq(ownerAmount, 990);
        assertEq(treasuryFee, 5);
        assertEq(partnerReward, 3);
        assertEq(executionReward, 2);
        assertEq(token.balanceOf(KEEPER), 2);
        assertEq(token.balanceOf(address(subscription)), 0);
    }

    function test_InvalidBindingAndDestinationSubstitutionFail() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 0);
        permission.extraData = abi.encode(bytes32("wrong"), address(factory), bytes32(0), address(0));
        vm.expectRevert(GOTSubscription.InvalidBinding.selector);
        subscription.execute(permission, hex"01", config);

        permission = _permissionFor(config);
        config.ownerSource = address(0xDEAD);
        vm.expectRevert(GOTSubscription.InvalidBinding.selector);
        subscription.execute(permission, hex"01", config);

        permission = _permissionFor(config);
        permission.spender = KEEPER;
        vm.expectRevert(GOTSubscription.InvalidPermission.selector);
        subscription.execute(permission, hex"01", config);
    }

    function test_UnresolvedOwnerRollsBackSpendAndRevocationPreventsCharge() public {
        MockOwnerResolver resolver = new MockOwnerResolver();
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(address(resolver), bytes32(uint256(1)), 0);
        uint256 subscriberBefore = token.balanceOf(SUBSCRIBER);

        vm.prank(KEEPER);
        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        subscription.execute(permission, hex"01", config);
        assertEq(token.balanceOf(SUBSCRIBER), subscriberBefore);
        assertEq(factory.previewAddress(config).code.length, 0);

        resolver.setOwner(MERCHANT);
        vm.prank(SUBSCRIBER);
        permissionManager.approve(permission);
        vm.prank(SUBSCRIBER);
        permissionManager.revoke(permission);
        vm.prank(KEEPER);
        vm.expectRevert(MockSpendPermissionManager.UnauthorizedSpendPermission.selector);
        subscription.execute(permission, "", config);
    }

    function test_InvalidPermissionTimeRangeFailsBeforeApproval() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 0);

        permission.end = permission.start;
        vm.expectRevert(GOTSubscription.InvalidPermission.selector);
        subscription.execute(permission, hex"01", config);
        assertFalse(permissionManager.isApproved(permission));

        permission.end = 0;
        vm.expectRevert(GOTSubscription.InvalidPermission.selector);
        subscription.execute(permission, hex"01", config);
        assertFalse(permissionManager.isApproved(permission));
    }

    function test_NewPeriodAllowsNextExactCharge() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 0);
        vm.prank(KEEPER);
        subscription.execute(permission, hex"01", config);
        vm.warp(block.timestamp + permission.period);
        vm.prank(KEEPER);
        subscription.execute(permission, "", config);
        assertEq(token.balanceOf(MERCHANT), uint256(config.amount) * 2);
    }

    function test_PreExistingAdapterAndIntentBalancesArePreservedAndReconciled() public {
        (
            IGOTFactory.IntentConfig memory config,
            ISpendPermissionManager.SpendPermission memory permission
        ) = _boundTransfer(MERCHANT, bytes32(0), 0);
        address intent = factory.previewAddress(config);
        token.mint(address(subscription), 77);
        token.mint(intent, 33);

        vm.prank(KEEPER);
        (, uint256 processedAmount, uint256 ownerAmount, , , ) = subscription.execute(permission, hex"01", config);

        assertEq(processedAmount, 1_033);
        assertEq(ownerAmount, 1_033);
        assertEq(token.balanceOf(MERCHANT), 1_033);
        assertEq(token.balanceOf(address(subscription)), 77);
        assertEq(token.balanceOf(intent), 0);
    }

    function test_PermissionStartIsInclusiveAndEndIsExclusive() public {
        uint48 start = uint48(block.timestamp + 10);
        IGOTFactory.IntentConfig memory config = IGOTFactory.IntentConfig({
            intentId: keccak256("permission-boundaries"),
            ownerSource: MERCHANT,
            ownerKey: bytes32(0),
            token: address(token),
            partner: address(0),
            authorizedResolver: address(subscription),
            amount: 1_000,
            initialDeadline: uint64(start),
            period: 30 days,
            feeBps: 0,
            metadataHash: bytes32(0)
        });
        ISpendPermissionManager.SpendPermission memory permission = _permissionFor(config);
        permission.end = start + 1;

        vm.expectRevert(
            abi.encodeWithSelector(
                MockSpendPermissionManager.BeforeSpendPermissionStart.selector,
                uint48(block.timestamp),
                start
            )
        );
        subscription.execute(permission, hex"01", config);
        assertFalse(permissionManager.isApproved(permission));

        vm.warp(start);
        subscription.execute(permission, hex"01", config);
        assertEq(token.balanceOf(MERCHANT), 1_000);

        vm.warp(permission.end);
        vm.expectRevert(
            abi.encodeWithSelector(
                MockSpendPermissionManager.AfterSpendPermissionEnd.selector,
                permission.end,
                permission.end
            )
        );
        subscription.execute(permission, "", config);
    }

    function _boundTransfer(
        address ownerSource,
        bytes32 ownerKey,
        uint16 feeBps
    )
        internal
        view
        returns (IGOTFactory.IntentConfig memory config, ISpendPermissionManager.SpendPermission memory permission)
    {
        config = IGOTFactory.IntentConfig({
            intentId: keccak256(abi.encode(ownerSource, ownerKey, feeBps)),
            ownerSource: ownerSource,
            ownerKey: ownerKey,
            token: address(token),
            partner: address(0),
            authorizedResolver: address(subscription),
            amount: 1_000,
            initialDeadline: uint64(block.timestamp),
            period: 30 days,
            feeBps: feeBps,
            metadataHash: bytes32(0)
        });
        permission = _permissionFor(config);
    }

    function _permissionFor(
        IGOTFactory.IntentConfig memory config
    ) internal view returns (ISpendPermissionManager.SpendPermission memory permission) {
        bytes32 hash = factory.configHash(config);
        address intent = factory.previewAddress(config);
        GOTSubscription.SubscriptionBinding memory binding = GOTSubscription.SubscriptionBinding({
            version: subscription.BINDING_VERSION(),
            factory: address(factory),
            configHash: hash,
            intent: intent
        });
        permission = ISpendPermissionManager.SpendPermission({
            account: SUBSCRIBER,
            spender: address(subscription),
            token: config.token,
            allowance: uint160(config.amount),
            period: uint48(config.period),
            start: uint48(config.initialDeadline),
            end: type(uint48).max,
            salt: 1,
            extraData: abi.encode(binding)
        });
    }
}
