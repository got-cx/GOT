// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice Generic, one-hop effective-owner resolver used by GOT intents.
interface IGOTOwnerResolver is IERC165 {
  function resolveOwner(address intent, bytes32 ownerKey) external view returns (address);
}
