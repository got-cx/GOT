// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockERC1271Verifier is IERC1271 {
  address public immutable SIGNER;

  constructor(address signer_) {
    SIGNER = signer_;
  }

  function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
    return ECDSA.recover(hash, signature) == SIGNER ? IERC1271.isValidSignature.selector : bytes4(0);
  }
}
