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
  error InvalidSender(address sender, address expected);
  error ZeroToken();
  error ZeroSpender();
  error ZeroAllowance();
  error ZeroPeriod();
  error InvalidStartEnd(uint48 start, uint48 end);
  error ZeroValue();
  error UnauthorizedSpendPermission();
  error BeforeSpendPermissionStart(uint48 currentTimestamp, uint48 start);
  error AfterSpendPermissionEnd(uint48 currentTimestamp, uint48 end);
  error ExceededSpendPermission(uint256 value, uint256 allowance);

  function approveWithSignature(SpendPermission calldata permission, bytes calldata signature)
    external
    returns (bool)
  {
    if (signature.length == 0) revert InvalidSignature();
    return _approve(permission);
  }

  function approve(SpendPermission calldata permission) external returns (bool) {
    _requireSender(permission.account);
    return _approve(permission);
  }

  function revoke(SpendPermission calldata permission) external {
    _requireSender(permission.account);
    revoked[_hash(permission)] = true;
  }

  function spend(SpendPermission calldata permission, uint160 value) external {
    _requireSender(permission.spender);
    if (value == 0) revert ZeroValue();

    bytes32 hash = _hash(permission);
    if (!approved[hash] || revoked[hash]) revert UnauthorizedSpendPermission();

    uint48 currentTimestamp = uint48(block.timestamp);
    if (currentTimestamp < permission.start) {
      revert BeforeSpendPermissionStart(currentTimestamp, permission.start);
    }
    if (currentTimestamp >= permission.end) {
      revert AfterSpendPermissionEnd(currentTimestamp, permission.end);
    }
    // The production manager rejects zero periods during approval. Keep this
    // defensive check so malformed test state cannot panic during division.
    if (permission.period == 0) revert ZeroPeriod();

    uint256 periodIndex = (block.timestamp - permission.start) / permission.period;
    uint160 spent = periodSpend[hash][periodIndex];
    uint256 totalSpend = uint256(spent) + value;
    if (totalSpend > permission.allowance) {
      revert ExceededSpendPermission(totalSpend, permission.allowance);
    }
    periodSpend[hash][periodIndex] = uint160(totalSpend);
    IERC20(permission.token).safeTransferFrom(permission.account, permission.spender, value);
  }

  function isApproved(SpendPermission calldata permission) external view returns (bool) {
    return approved[_hash(permission)];
  }

  function isRevoked(SpendPermission calldata permission) external view returns (bool) {
    return revoked[_hash(permission)];
  }

  function _approve(SpendPermission calldata permission) internal returns (bool) {
    if (permission.token == address(0)) revert ZeroToken();
    if (permission.spender == address(0)) revert ZeroSpender();
    if (permission.period == 0) revert ZeroPeriod();
    if (permission.allowance == 0) revert ZeroAllowance();
    if (permission.start >= permission.end) {
      revert InvalidStartEnd(permission.start, permission.end);
    }

    bytes32 hash = _hash(permission);
    if (revoked[hash]) return false;
    approved[hash] = true;
    return true;
  }

  function _requireSender(address expected) internal view {
    if (msg.sender != expected) revert InvalidSender(msg.sender, expected);
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
