// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IGOTFactory} from "../core/interfaces/IGOTFactory.sol";
import {ISpendPermissionManager} from "./interfaces/ISpendPermissionManager.sol";

/// @title GOTSubscription
/// @notice Exact-binding adapter between Base Spend Permissions and GOT intents.
contract GOTSubscription is ReentrancyGuard {
  using SafeERC20 for IERC20;

  struct SubscriptionBinding {
    bytes32 version;
    address factory;
    bytes32 configHash;
    address intent;
  }

  struct ExecutionResult {
    uint256 processedAmount;
    uint256 ownerAmount;
    uint256 treasuryFee;
    uint256 partnerReward;
    uint256 executionReward;
  }

  bytes32 public constant BINDING_VERSION = keccak256("GOT_SUBSCRIPTION_BINDING_V2");

  IGOTFactory public immutable GOT_FACTORY;
  ISpendPermissionManager public immutable SPEND_PERMISSION_MANAGER;

  event SubscriptionTransferProcessed(
    bytes32 indexed intentId,
    address indexed subscriber,
    address indexed intent,
    address executor,
    uint256 processedAmount,
    uint256 ownerAmount,
    uint256 treasuryFee,
    uint256 partnerReward,
    uint256 executionReward
  );

  error InvalidConfiguration();
  error InvalidPermission();
  error InvalidBinding();
  error PermissionApprovalFailed();
  error IncorrectReceivedAmount();
  error IncorrectResidualBalance();

  constructor(address gotFactory_, address spendPermissionManager_) {
    if (
      gotFactory_ == address(0) || gotFactory_.code.length == 0
        || spendPermissionManager_ == address(0) || spendPermissionManager_.code.length == 0
    ) revert InvalidConfiguration();
    GOT_FACTORY = IGOTFactory(gotFactory_);
    SPEND_PERMISSION_MANAGER = ISpendPermissionManager(spendPermissionManager_);
  }

  function execute(
    ISpendPermissionManager.SpendPermission calldata permission,
    bytes calldata approvalSignature,
    IGOTFactory.IntentConfig calldata config
  )
    external
    nonReentrant
    returns (
      address intent,
      uint256 processedAmount,
      uint256 ownerAmount,
      uint256 treasuryFee,
      uint256 partnerReward,
      uint256 executionReward
    )
  {
    intent = GOT_FACTORY.previewAddress(config);
    _validateBinding(permission, config, intent);

    if (!SPEND_PERMISSION_MANAGER.isApproved(permission)) {
      if (!SPEND_PERMISSION_MANAGER.approveWithSignature(permission, approvalSignature)) {
        revert PermissionApprovalFailed();
      }
    }

    ExecutionResult memory result = _chargeAndExecute(permission, config, intent);
    processedAmount = result.processedAmount;
    ownerAmount = result.ownerAmount;
    treasuryFee = result.treasuryFee;
    partnerReward = result.partnerReward;
    executionReward = result.executionReward;

    emit SubscriptionTransferProcessed(
      config.intentId,
      permission.account,
      intent,
      msg.sender,
      processedAmount,
      ownerAmount,
      treasuryFee,
      partnerReward,
      executionReward
    );
  }

  function _chargeAndExecute(
    ISpendPermissionManager.SpendPermission calldata permission,
    IGOTFactory.IntentConfig calldata config,
    address intent
  ) internal returns (ExecutionResult memory result) {
    IERC20 configuredToken = IERC20(config.token);
    uint256 initialBalance = configuredToken.balanceOf(address(this));
    SPEND_PERMISSION_MANAGER.spend(permission, uint160(config.amount));
    uint256 fundedBalance = configuredToken.balanceOf(address(this));
    if (fundedBalance < initialBalance || fundedBalance - initialBalance != config.amount) {
      revert IncorrectReceivedAmount();
    }

    configuredToken.safeTransfer(intent, config.amount);
    address deployedIntent;
    (
      deployedIntent,
      result.processedAmount,
      result.ownerAmount,
      result.treasuryFee,
      result.partnerReward,
      result.executionReward
    ) = GOT_FACTORY.deployAndExecute(config);
    if (deployedIntent != intent) revert InvalidBinding();

    if (result.executionReward != 0) {
      configuredToken.safeTransfer(msg.sender, result.executionReward);
    }
    if (configuredToken.balanceOf(address(this)) != initialBalance) {
      revert IncorrectResidualBalance();
    }
  }

  function _validateBinding(
    ISpendPermissionManager.SpendPermission calldata permission,
    IGOTFactory.IntentConfig calldata config,
    address intent
  ) internal view {
    if (
      permission.account == address(0) || permission.spender != address(this)
        || permission.token != config.token || permission.allowance != uint160(config.amount)
        || config.period == 0 || permission.period != uint48(config.period)
        || config.initialDeadline > type(uint48).max
        || permission.start != uint48(config.initialDeadline)
        || config.authorizedResolver != address(this)
    ) revert InvalidPermission();

    // Four static ABI words are canonical; rejecting trailing bytes removes
    // alternate encodings from the binding surface.
    if (permission.extraData.length != 128) revert InvalidBinding();
    SubscriptionBinding memory binding = abi.decode(permission.extraData, (SubscriptionBinding));
    if (
      binding.version != BINDING_VERSION || binding.factory != address(GOT_FACTORY)
        || binding.configHash != GOT_FACTORY.configHash(config) || binding.intent != intent
    ) revert InvalidBinding();
  }
}
