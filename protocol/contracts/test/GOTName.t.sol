// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { Test } from "forge-std/Test.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { GOTName } from "../periphery/GOTName.sol";
import { GOTIntent } from "../core/GOTIntent.sol";
import { GOTFactory } from "../core/GOTFactory.sol";
import { IGOTFactory } from "../core/interfaces/IGOTFactory.sol";
import { IGOTOwnerResolver } from "../core/interfaces/IGOTOwnerResolver.sol";
import { IGOTName } from "../periphery/interfaces/IGOTName.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockERC1271Verifier } from "./mocks/MockERC1271Verifier.sol";

contract GOTNameTest is Test {
    uint256 internal constant VERIFIER_KEY = 0xA11CE;
    address internal verifier;
    address internal constant ALICE = address(0xA71CE);
    address internal constant BOB = address(0xB0B);

    function setUp() public {
        verifier = vm.addr(VERIFIER_KEY);
    }

    function test_EOAClaimTransferAndReplayProtection() public {
        GOTName names = new GOTName(verifier);
        bytes32 key = names.deriveNameKey("got:alice");
        IGOTName.Claim memory claimData = IGOTName.Claim(key, ALICE, uint48(block.timestamp + 1 hours));
        bytes memory signature = _sign(names, claimData, VERIFIER_KEY);

        names.claim(claimData, signature);
        assertEq(names.accountOf(key), ALICE);
        assertEq(names.resolveOwner(address(0x123), key), ALICE);

        vm.expectRevert(GOTName.AlreadyClaimed.selector);
        names.claim(claimData, signature);

        vm.prank(ALICE);
        names.transfer(key, BOB);
        assertEq(names.accountOf(key), BOB);

        vm.prank(BOB);
        vm.expectRevert(GOTName.NoAccountChange.selector);
        names.transfer(key, BOB);

        vm.prank(ALICE);
        vm.expectRevert(GOTName.Unauthorized.selector);
        names.transfer(key, ALICE);
    }

    function test_NameKeyGoldenVectorAndERC165Conformance() public {
        GOTName names = new GOTName(verifier);
        assertEq(uint256(uint32(type(IGOTName).interfaceId)), uint256(uint32(0x73a79167)));
        assertEq(names.deriveNameKey("got:alice"), 0x290cbb90ea5d4db112ae658d2fda3e05c4d161902491e0a6e7bcbbd81c7a339e);
        assertEq(
            names.deriveNameKey("email:alice@example.com"),
            0x3425d4006b9f3db86dbe07521c674f43120dd17e73e7d338dff954ac5202b822
        );
        assertEq(
            names.deriveNameKey("ens:alice.eth"),
            0xa96e7a476dbfca9801a9ac0211c2cccdc08ad58e8b3432133d860dc8b5277de4
        );
        assertEq(
            names.deriveNameKey("domain:xn--bcher-kva.example"),
            0x77d0bb7017b33c0b3da8b68bd1da930c492a1aa30837596fe5ad39dda8fbb054
        );
        assertEq(
            names.deriveNameKey("custom:shop:order-123"),
            0x9271bae65fa0f8dbe2a69fe28f554718563f751ed7c339b9dce87ef532143aab
        );
        assertTrue(names.supportsInterface(type(IGOTName).interfaceId));
        assertTrue(names.supportsInterface(type(IGOTOwnerResolver).interfaceId));
        assertTrue(names.supportsInterface(type(IERC165).interfaceId));
        assertFalse(names.supportsInterface(0xffffffff));
    }

    function test_ERC1271VerifierAndDomainSeparation() public {
        address signer = vm.addr(VERIFIER_KEY);
        MockERC1271Verifier contractVerifier = new MockERC1271Verifier(signer);
        GOTName names = new GOTName(address(contractVerifier));
        GOTName otherNames = new GOTName(address(contractVerifier));
        IGOTName.Claim memory claimData = IGOTName.Claim(
            names.deriveNameKey("x:alice"),
            ALICE,
            uint48(block.timestamp + 1 hours)
        );

        bytes memory signature = _sign(names, claimData, VERIFIER_KEY);
        names.claim(claimData, signature);
        assertEq(names.accountOf(claimData.nameKey), ALICE);

        vm.expectRevert(GOTName.InvalidVerifierSignature.selector);
        otherNames.claim(claimData, signature);
    }

    function test_ExpiredInvalidAndUnauthorizedClaimsFail() public {
        vm.expectRevert(GOTName.InvalidAccount.selector);
        new GOTName(address(0));

        GOTName names = new GOTName(verifier);
        IGOTName.Claim memory expired = IGOTName.Claim(keccak256("expired"), ALICE, uint48(block.timestamp));
        vm.warp(block.timestamp + 1);
        bytes memory expiredSignature = _sign(names, expired, VERIFIER_KEY);
        vm.expectRevert(GOTName.ClaimExpired.selector);
        names.claim(expired, expiredSignature);

        IGOTName.Claim memory invalid = IGOTName.Claim(bytes32(0), ALICE, uint48(block.timestamp + 1));
        vm.expectRevert(GOTName.InvalidNameKey.selector);
        names.claim(invalid, "");

        IGOTName.Claim memory zeroAccount = IGOTName.Claim(
            keccak256("zero-account"),
            address(0),
            uint48(block.timestamp + 1)
        );
        vm.expectRevert(GOTName.InvalidAccount.selector);
        names.claim(zeroAccount, "");

        IGOTName.Claim memory resolverAccount = IGOTName.Claim(
            keccak256("resolver-account"),
            address(names),
            uint48(block.timestamp + 1)
        );
        vm.expectRevert(GOTName.InvalidAccount.selector);
        names.claim(resolverAccount, "");

        IGOTName.Claim memory wrongSigner = IGOTName.Claim(
            keccak256("wrong"),
            ALICE,
            uint48(block.timestamp + 1 hours)
        );
        bytes memory wrongSignature = _sign(names, wrongSigner, 0xBEEF);
        vm.expectRevert(GOTName.InvalidVerifierSignature.selector);
        names.claim(wrongSigner, wrongSignature);

        vm.expectRevert(GOTName.InvalidNameKey.selector);
        names.transfer(bytes32(0), ALICE);
        vm.expectRevert(GOTName.InvalidAccount.selector);
        names.transfer(keccak256("unclaimed"), address(0));
        vm.expectRevert(GOTName.InvalidAccount.selector);
        names.transfer(keccak256("unclaimed"), address(names));
        vm.expectRevert(GOTName.NameNotClaimed.selector);
        names.transfer(keccak256("unclaimed"), ALICE);
    }

    function test_ClaimAfterCounterfactualFundingUnlocksAllNamedIntents() public {
        GOTName names = new GOTName(verifier);
        MockERC20 token = new MockERC20();
        GOTIntent implementation = new GOTIntent(address(0x111), 2_000, 2_500);
        GOTFactory factory = new GOTFactory(address(implementation), address(0x111), 2_000, 2_500, 1_000);
        bytes32 key = keccak256("email:opaque-key");
        IGOTFactory.IntentConfig memory config = IGOTFactory.IntentConfig({
            intentId: keccak256("named-intent"),
            ownerSource: address(names),
            ownerKey: key,
            token: address(token),
            partner: address(0),
            authorizedResolver: address(0),
            amount: 500,
            initialDeadline: 0,
            period: 0,
            feeBps: 0,
            metadataHash: bytes32(0)
        });
        address intent = factory.previewAddress(config);
        token.mint(intent, 500);

        vm.expectRevert(GOTIntent.OwnerUnresolved.selector);
        factory.deployAndExecute(config);

        IGOTName.Claim memory claimData = IGOTName.Claim(key, ALICE, uint48(block.timestamp + 1 hours));
        names.claim(claimData, _sign(names, claimData, VERIFIER_KEY));
        factory.deployAndExecute(config);
        assertEq(token.balanceOf(ALICE), 500);
    }

    function _sign(
        GOTName names,
        IGOTName.Claim memory claimData,
        uint256 key
    ) internal view returns (bytes memory signature) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("GOTName"),
                keccak256("1"),
                block.chainid,
                address(names)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(names.CLAIM_TYPEHASH(), claimData.nameKey, claimData.account, claimData.deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        signature = abi.encodePacked(r, s, v);
    }
}
