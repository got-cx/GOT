// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal interface for Coinbase's canonical SpendPermissionManager.
/// @dev Struct and selectors are pinned to coinbase/spend-permissions commit
/// e0004e63edc4e17de7aa978293800ac7a16892e5.
interface ISpendPermissionManager {
  struct SpendPermission {
    address account;
    address spender;
    address token;
    uint160 allowance;
    uint48 period;
    uint48 start;
    uint48 end;
    uint256 salt;
    bytes extraData;
  }

  function approveWithSignature(SpendPermission calldata spendPermission, bytes calldata signature)
    external
    returns (bool approved);

  function spend(SpendPermission calldata spendPermission, uint160 value) external;

  function isApproved(SpendPermission calldata spendPermission) external view returns (bool approved);
}
