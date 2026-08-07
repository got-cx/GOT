// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { IGOTOwnerResolver } from "../../core/interfaces/IGOTOwnerResolver.sol";

interface IGOTName is IGOTOwnerResolver {
    struct Claim {
        bytes32 nameKey;
        address account;
        uint48 deadline;
    }

    function deriveNameKey(string calldata canonicalIdentity) external pure returns (bytes32);
    function accountOf(bytes32 nameKey) external view returns (address);
    function claim(Claim calldata claimData, bytes calldata verifierSignature) external;
    function transfer(bytes32 nameKey, address newAccount) external;
}
