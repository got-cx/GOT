// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { IERC1271 } from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockERC1271Verifier is IERC1271 {
    address public immutable SIGNER;

    constructor(address signer_) {
        SIGNER = signer_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        return ECDSA.recover(hash, signature) == SIGNER ? IERC1271.isValidSignature.selector : bytes4(0);
    }
}

contract StrictCalldataERC1271Verifier is IERC1271 {
    address public immutable SIGNER;

    constructor(address signer_) {
        SIGNER = signer_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        // Dynamic ABI values must be padded so the calldata following the selector
        // is an exact multiple of one word. OpenZeppelin 5.7.0 guarantees this.
        if ((msg.data.length - 4) % 32 != 0) return bytes4(0);
        return ECDSA.recover(hash, signature) == SIGNER ? IERC1271.isValidSignature.selector : bytes4(0);
    }
}
