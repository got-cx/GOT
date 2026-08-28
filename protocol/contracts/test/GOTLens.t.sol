// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { Test } from "forge-std/Test.sol";
import { GOTFactory } from "../core/GOTFactory.sol";
import { GOTIntent } from "../core/GOTIntent.sol";
import { IGOTFactory } from "../core/interfaces/IGOTFactory.sol";
import { GOTLens } from "../periphery/GOTLens.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockOwnerResolver } from "./mocks/MockOwnerResolver.sol";

contract GOTLensTest is Test {
    address internal constant TREASURY = address(0xA11CE);
    address internal constant OWNER = address(0xB0B);

    GOTFactory internal factory;
    GOTLens internal lens;
    MockERC20 internal token;

    function setUp() public {
        GOTIntent implementation = new GOTIntent(TREASURY, 2_000, 3_750);
        factory = new GOTFactory(address(implementation), TREASURY, 2_000, 3_750, 1_000);
        lens = new GOTLens(address(factory));
        token = new MockERC20();
    }

    function test_RejectsInvalidFactory() public {
        vm.expectRevert(GOTLens.InvalidFactory.selector);
        new GOTLens(address(0));
        vm.expectRevert(GOTLens.InvalidFactory.selector);
        new GOTLens(address(0x1234));
    }

    function test_ReadsCounterfactualAndDeployedSnapshots() public {
        IGOTFactory.IntentConfig memory counterfactual = _config(bytes32("counterfactual"), OWNER, bytes32(0));
        address counterfactualAddress = factory.previewAddress(counterfactual);
        token.mint(counterfactualAddress, 25);

        GOTLens.IntentSnapshot memory beforeDeployment = lens.snapshot(counterfactual);
        assertEq(beforeDeployment.intentAddress, counterfactualAddress);
        assertTrue(beforeDeployment.configValid);
        assertFalse(beforeDeployment.deployed);
        assertFalse(beforeDeployment.canonical);
        assertTrue(beforeDeployment.balanceRead);
        assertEq(beforeDeployment.balance, 25);
        assertFalse(beforeDeployment.stateRead);
        assertTrue(beforeDeployment.ownerResolved);
        assertEq(beforeDeployment.effectiveOwner, OWNER);

        factory.deployAndExecute(counterfactual);
        token.mint(counterfactualAddress, 7);

        GOTLens.IntentSnapshot memory afterDeployment = lens.snapshot(counterfactual);
        assertTrue(afterDeployment.deployed);
        assertTrue(afterDeployment.canonical);
        assertTrue(afterDeployment.balanceRead);
        assertEq(afterDeployment.balance, 7);
        assertTrue(afterDeployment.stateRead);
        assertEq(afterDeployment.totalProcessed, 25);
        assertTrue(afterDeployment.ownerResolved);
        assertEq(afterDeployment.effectiveOwner, OWNER);
    }

    function test_BatchDoesNotRevertForInvalidConfigOrUnresolvedOwner() public {
        MockOwnerResolver resolver = new MockOwnerResolver();
        IGOTFactory.IntentConfig[] memory configs = new IGOTFactory.IntentConfig[](3);
        configs[0] = _config(bytes32("direct"), OWNER, bytes32(0));
        configs[1] = _config(bytes32("invalid"), address(0), bytes32(0));
        configs[1].amount = 0;
        configs[2] = _config(bytes32("unresolved"), address(resolver), bytes32(uint256(1)));

        GOTLens.IntentSnapshot[] memory snapshots = lens.snapshotMany(configs);
        assertEq(snapshots.length, 3);
        assertTrue(snapshots[0].configValid);
        assertTrue(snapshots[0].ownerResolved);
        assertFalse(snapshots[1].configValid);
        assertEq(snapshots[1].intentAddress, address(0));
        assertTrue(snapshots[2].configValid);
        assertFalse(snapshots[2].ownerResolved);

        resolver.setOwner(OWNER);
        GOTLens.IntentSnapshot memory resolved = lens.snapshot(configs[2]);
        assertTrue(resolved.ownerResolved);
        assertEq(resolved.effectiveOwner, OWNER);
    }

    function _config(
        bytes32 intentId,
        address ownerSource,
        bytes32 ownerKey
    ) private view returns (IGOTFactory.IntentConfig memory) {
        return
            IGOTFactory.IntentConfig({
                intentId: intentId,
                ownerSource: ownerSource,
                ownerKey: ownerKey,
                token: address(token),
                partner: address(0),
                authorizedResolver: address(0),
                amount: 1,
                initialDeadline: 0,
                period: 0,
                feeBps: 0,
                metadataHash: bytes32(0)
            });
    }
}
