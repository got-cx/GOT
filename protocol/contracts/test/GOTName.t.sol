// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {GOTName} from "../periphery/GOTName.sol";
import {GOTIntent} from "../core/GOTIntent.sol";
import {GOTFactory} from "../core/GOTFactory.sol";
import {IGOTFactory} from "../core/interfaces/IGOTFactory.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC1271Verifier} from "./mocks/MockERC1271Verifier.sol";

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
    bytes32 key = keccak256("got:@alice");
    GOTName.Claim memory claimData = GOTName.Claim(key, ALICE, uint48(block.timestamp + 1 hours));
    bytes memory signature = _sign(names, claimData, VERIFIER_KEY);

    names.claim(claimData, signature);
    assertEq(names.accountOf(key), ALICE);
    assertEq(names.resolveOwner(address(0x123), key), ALICE);

    vm.expectRevert(GOTName.AlreadyClaimed.selector);
    names.claim(claimData, signature);

    vm.prank(ALICE);
    names.transfer(key, BOB);
    assertEq(names.accountOf(key), BOB);

    vm.prank(ALICE);
    vm.expectRevert(GOTName.Unauthorized.selector);
    names.transfer(key, ALICE);
  }

  function test_ERC1271VerifierAndDomainSeparation() public {
    address signer = vm.addr(VERIFIER_KEY);
    MockERC1271Verifier contractVerifier = new MockERC1271Verifier(signer);
    GOTName names = new GOTName(address(contractVerifier));
    GOTName otherNames = new GOTName(address(contractVerifier));
    GOTName.Claim memory claimData =
      GOTName.Claim(keccak256("x:@alice"), ALICE, uint48(block.timestamp + 1 hours));

    bytes memory signature = _sign(names, claimData, VERIFIER_KEY);
    names.claim(claimData, signature);
    assertEq(names.accountOf(claimData.nameKey), ALICE);

    vm.expectRevert(GOTName.InvalidVerifierSignature.selector);
    otherNames.claim(claimData, signature);
  }

  function test_ExpiredInvalidAndUnauthorizedClaimsFail() public {
    GOTName names = new GOTName(verifier);
    GOTName.Claim memory expired =
      GOTName.Claim(keccak256("expired"), ALICE, uint48(block.timestamp));
    vm.warp(block.timestamp + 1);
    bytes memory expiredSignature = _sign(names, expired, VERIFIER_KEY);
    vm.expectRevert(GOTName.ClaimExpired.selector);
    names.claim(expired, expiredSignature);

    GOTName.Claim memory invalid = GOTName.Claim(bytes32(0), ALICE, uint48(block.timestamp + 1));
    vm.expectRevert(GOTName.InvalidNameKey.selector);
    names.claim(invalid, "");

    GOTName.Claim memory wrongSigner =
      GOTName.Claim(keccak256("wrong"), ALICE, uint48(block.timestamp + 1 hours));
    bytes memory wrongSignature = _sign(names, wrongSigner, 0xBEEF);
    vm.expectRevert(GOTName.InvalidVerifierSignature.selector);
    names.claim(wrongSigner, wrongSignature);
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

    GOTName.Claim memory claimData = GOTName.Claim(key, ALICE, uint48(block.timestamp + 1 hours));
    names.claim(claimData, _sign(names, claimData, VERIFIER_KEY));
    factory.deployAndExecute(config);
    assertEq(token.balanceOf(ALICE), 500);
  }

  function _sign(GOTName names, GOTName.Claim memory claimData, uint256 key)
    internal
    view
    returns (bytes memory signature)
  {
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
