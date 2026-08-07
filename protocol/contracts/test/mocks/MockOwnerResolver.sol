// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IGOTOwnerResolver } from "../../core/interfaces/IGOTOwnerResolver.sol";

contract MockOwnerResolver is IGOTOwnerResolver {
    address public resolvedOwner;
    bool public revertResolution;
    bool public exhaustGas;

    function setOwner(address owner_) external {
        resolvedOwner = owner_;
    }

    function setRevertResolution(bool value) external {
        revertResolution = value;
    }

    function setExhaustGas(bool value) external {
        exhaustGas = value;
    }

    function resolveOwner(address, bytes32) external view returns (address) {
        if (revertResolution) revert("resolution failed");
        if (exhaustGas) {
            assembly ("memory-safe") {
                for {} 1 {} {}
            }
        }
        return resolvedOwner;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IGOTOwnerResolver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}

contract NotAResolver {}

contract MalformedOwnerResolver {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IGOTOwnerResolver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    fallback() external {
        assembly ("memory-safe") {
            mstore(0, 1)
            return(31, 1)
        }
    }
}
