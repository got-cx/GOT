// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Canonical public GOT name-key derivation.
/// @dev The input is the GOT Links Model canonical string, e.g. "got:dima".
library GOTNameKeys {
    function deriveIdentifierKey(string memory canonicalIdentity) internal pure returns (bytes32) {
        return keccak256(bytes(canonicalIdentity));
    }
}
