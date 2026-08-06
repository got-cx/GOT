// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISpendPermissionManager} from "../../periphery/interfaces/ISpendPermissionManager.sol";

contract MockSpendPermissionManager is ISpendPermissionManager {
  using SafeERC20 for IERC20;

  mapping(bytes32 => bool) public approved;
  mapping(bytes32 => bool) public revoked;
  mapping(bytes32 => mapping(uint256 => uint160)) public periodSpend;

  error InvalidSignature();
  error Unauthorized();
  error PermissionInvalid();
  error AllowanceExceeded();

  function approveWithSignature(SpendPermission calldata permission, bytes calldata signature)
    external
    returns (bool)
  {
    if (signature.length == 0) revert InvalidSignature();
    bytes32 hash = _hash(permission);
    if (revoked[hash]) revert PermissionInvalid();
    approved[hash] = true;
    return true;
  }

  function approve(SpendPermission calldata permission) external {
    if (msg.sender != permission.account) revert Unauthorized();
    approved[_hash(permission)] = true;
  }

  function revoke(SpendPermission calldata permission) external {
    if (msg.sender != permission.account) revert Unauthorized();
    revoked[_hash(permission)] = true;
  }

  function spend(SpendPermission calldata permission, uint160 value) external {
    if (msg.sender != permission.spender) revert Unauthorized();
    bytes32 hash = _hash(permission);
    if (!approved[hash] || revoked[hash] || block.timestamp < permission.start) {
      revert PermissionInvalid();
    }
    if (permission.end != 0 && block.timestamp >= permission.end) revert PermissionInvalid();
    uint256 periodIndex = (block.timestamp - permission.start) / permission.period;
    uint160 spent = periodSpend[hash][periodIndex];
    if (value > permission.allowance - spent) revert AllowanceExceeded();
    periodSpend[hash][periodIndex] = spent + value;
    IERC20(permission.token).safeTransferFrom(permission.account, permission.spender, value);
  }

  function isApproved(SpendPermission calldata permission) external view returns (bool) {
    return approved[_hash(permission)];
  }

  function _hash(SpendPermission calldata permission) internal pure returns (bytes32) {
    return keccak256(
      abi.encode(
        permission.account,
        permission.spender,
        permission.token,
        permission.allowance,
        permission.period,
        permission.start,
        permission.end,
        permission.salt,
        keccak256(permission.extraData)
      )
    );
  }
}
