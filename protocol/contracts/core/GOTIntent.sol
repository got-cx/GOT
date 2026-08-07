// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IGOTIntent } from "./interfaces/IGOTIntent.sol";
import { IGOTOwnerResolver } from "./interfaces/IGOTOwnerResolver.sol";

/// @title GOTIntent
/// @notice Canonical implementation for deterministic GOT intent-address clones.
/// @dev Every public entry point validates the mandatory immutable-argument suffix.
contract GOTIntent is IGOTIntent {
    using SafeERC20 for IERC20;

    bytes32 public constant PROTOCOL_VERSION = keccak256("GOT_PROTOCOL_V0_2");
    uint16 public constant IMMUTABLE_ARGS_LENGTH = 226;
    uint256 public constant ERC165_GAS_LIMIT = 30_000;
    uint256 public constant OWNER_RESOLVER_GAS_LIMIT = 50_000;

    uint256 internal constant LOCK_BIT = uint256(1) << 255;
    uint256 internal constant TOTAL_MASK = LOCK_BIT - 1;
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    address public immutable TREASURY;
    uint16 public immutable EXECUTION_SHARE_BPS;
    uint16 public immutable PARTNER_SHARE_BPS;
    address private immutable IMPLEMENTATION_SELF;

    // The intent's only mutable slot: lock bit + cumulative gross processed value.
    uint256 private packedState;

    event TransferProcessed(
        address indexed executor,
        address indexed effectiveOwner,
        address indexed partner,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward,
        uint256 totalProcessed
    );
    event ERC20Recovered(address indexed asset, address indexed effectiveOwner, uint256 amount);
    event NativeRecovered(address indexed effectiveOwner, uint256 amount);

    error DirectImplementationCall();
    error UnauthorizedFactory();
    error UnauthorizedOwner();
    error UnauthorizedResolver();
    error InvalidExecutor();
    error InvalidConfiguration();
    error InvalidAsset();
    error NoFundsAvailable();
    error ReentrantExecution();
    error TotalProcessedOverflow();
    error ConfiguredTokenNotRecoverable();
    error OwnerUnresolved();
    error OwnerResolverUnavailable();
    error InvalidOwnerResolver();
    error OwnerResolutionFailed();
    error InvalidResolvedOwner();
    error TokenBalanceNotCleared();
    error NativeTransferFailed();

    constructor(address treasury_, uint16 executionShareBps_, uint16 partnerShareBps_) {
        if (
            treasury_ == address(0) ||
            executionShareBps_ == 0 ||
            executionShareBps_ >= BPS_DENOMINATOR ||
            partnerShareBps_ == 0 ||
            partnerShareBps_ >= BPS_DENOMINATOR
        ) revert InvalidConfiguration();

        TREASURY = treasury_;
        EXECUTION_SHARE_BPS = executionShareBps_;
        PARTNER_SHARE_BPS = partnerShareBps_;
        IMPLEMENTATION_SELF = address(this);
    }

    modifier onlyProxy() {
        _validateProxyContext();
        _;
    }

    /// @dev Allows intent addresses to receive native assets for owner recovery.
    fallback() external payable onlyProxy {}

    /// @dev Native transfers to clones reach fallback because the proxy appends args.
    receive() external payable {
        revert DirectImplementationCall();
    }

    function settle()
        external
        onlyProxy
        returns (
            address executor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        )
    {
        executor = msg.sender;
        effectiveOwner = _resolveOwner();
        if (effectiveOwner == address(0)) revert OwnerUnresolved();
        if (executor != effectiveOwner) revert UnauthorizedOwner();
        (processedAmount, ownerAmount, treasuryFee, partnerReward, executionReward) = _process(
            executor,
            effectiveOwner
        );
    }

    function resolve()
        external
        onlyProxy
        returns (
            address executor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        )
    {
        executor = msg.sender;
        effectiveOwner = _resolveOwner();
        if (effectiveOwner == address(0)) revert OwnerUnresolved();
        _authorizeResolver(executor);
        (processedAmount, ownerAmount, treasuryFee, partnerReward, executionReward) = _process(
            executor,
            effectiveOwner
        );
    }

    function executeFor(
        address executor
    )
        external
        onlyProxy
        returns (
            address authorizedExecutor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        )
    {
        if (msg.sender != _getArgAddress(206)) revert UnauthorizedFactory();
        if (executor == address(0) || executor == address(this)) revert InvalidExecutor();

        authorizedExecutor = executor;
        effectiveOwner = _resolveOwner();
        if (effectiveOwner == address(0)) revert OwnerUnresolved();
        if (executor != effectiveOwner) _authorizeResolver(executor);
        (processedAmount, ownerAmount, treasuryFee, partnerReward, executionReward) = _process(
            executor,
            effectiveOwner
        );
    }

    function owner() public view onlyProxy returns (address) {
        return _resolveOwner();
    }

    function totalProcessed() external view onlyProxy returns (uint256) {
        return packedState & TOTAL_MASK;
    }

    function intentId() external view onlyProxy returns (bytes32) {
        return _getArgBytes32(0);
    }

    function ownerSource() public view onlyProxy returns (address) {
        return _getArgAddress(32);
    }

    function ownerKey() public view onlyProxy returns (bytes32) {
        return _getArgBytes32(52);
    }

    function token() public view onlyProxy returns (address) {
        return _getArgAddress(84);
    }

    function partner() public view onlyProxy returns (address) {
        return _getArgAddress(104);
    }

    function authorizedResolver() public view onlyProxy returns (address) {
        return _getArgAddress(124);
    }

    function amount() external view onlyProxy returns (uint128) {
        return uint128(_getArgUint(144, 128));
    }

    function initialDeadline() external view onlyProxy returns (uint64) {
        return uint64(_getArgUint(160, 192));
    }

    function period() external view onlyProxy returns (uint32) {
        return uint32(_getArgUint(168, 224));
    }

    function feeBps() public view onlyProxy returns (uint16) {
        return uint16(_getArgUint(172, 240));
    }

    function metadataHash() external view onlyProxy returns (bytes32) {
        return _getArgBytes32(174);
    }

    function factory() external view onlyProxy returns (address) {
        return _getArgAddress(206);
    }

    function recoverERC20(address asset) external onlyProxy returns (uint256 recoveredAmount) {
        address effectiveOwner = _resolveOwner();
        if (effectiveOwner == address(0)) revert OwnerUnresolved();
        if (msg.sender != effectiveOwner) revert UnauthorizedOwner();

        address configuredToken = _getArgAddress(84);
        if (asset == configuredToken) revert ConfiguredTokenNotRecoverable();
        if (asset == address(0) || asset.code.length == 0) revert InvalidAsset();
        uint256 state = _acquireLock();

        IERC20 recoverable = IERC20(asset);
        recoveredAmount = recoverable.balanceOf(address(this));
        recoverable.safeTransfer(effectiveOwner, recoveredAmount);

        packedState = state;
        emit ERC20Recovered(asset, effectiveOwner, recoveredAmount);
    }

    function recoverNative() external onlyProxy returns (uint256 recoveredAmount) {
        address effectiveOwner = _resolveOwner();
        if (effectiveOwner == address(0)) revert OwnerUnresolved();
        if (msg.sender != effectiveOwner) revert UnauthorizedOwner();
        uint256 state = _acquireLock();

        recoveredAmount = address(this).balance;
        (bool success, ) = payable(effectiveOwner).call{ value: recoveredAmount }("");
        if (!success) revert NativeTransferFailed();

        packedState = state;
        emit NativeRecovered(effectiveOwner, recoveredAmount);
    }

    function _process(
        address executor,
        address effectiveOwner
    )
        internal
        returns (
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        )
    {
        uint256 previousTotal = _acquireLock();
        IERC20 configuredToken = IERC20(_getArgAddress(84));
        processedAmount = configuredToken.balanceOf(address(this));
        if (processedAmount == 0) revert NoFundsAvailable();
        if (processedAmount > TOTAL_MASK - previousTotal) revert TotalProcessedOverflow();

        uint256 newTotal = previousTotal + processedAmount;
        uint16 feeBps_ = uint16(_getArgUint(172, 240));
        address partner_ = _getArgAddress(104);
        (ownerAmount, treasuryFee, partnerReward, executionReward) = _allocation(
            previousTotal,
            newTotal,
            processedAmount,
            feeBps_,
            partner_ != address(0)
        );

        // Persist the cumulative total while retaining the lock during all token calls.
        packedState = LOCK_BIT | newTotal;
        if (treasuryFee != 0) configuredToken.safeTransfer(TREASURY, treasuryFee);
        if (partnerReward != 0) configuredToken.safeTransfer(partner_, partnerReward);
        if (executionReward != 0) configuredToken.safeTransfer(executor, executionReward);
        if (ownerAmount != 0) configuredToken.safeTransfer(effectiveOwner, ownerAmount);
        if (configuredToken.balanceOf(address(this)) != 0) revert TokenBalanceNotCleared();
        packedState = newTotal;

        emit TransferProcessed(
            executor,
            effectiveOwner,
            partner_,
            processedAmount,
            ownerAmount,
            treasuryFee,
            partnerReward,
            executionReward,
            newTotal
        );
    }

    function _allocation(
        uint256 previousTotal,
        uint256 newTotal,
        uint256 balance,
        uint16 feeBps_,
        bool hasPartner
    ) internal view returns (uint256 ownerAmount, uint256 treasuryFee, uint256 partnerReward, uint256 executionReward) {
        if (feeBps_ == 0) return (balance, 0, 0, 0);

        uint256 previousFee = Math.mulDiv(previousTotal, feeBps_, BPS_DENOMINATOR);
        uint256 newFee = Math.mulDiv(newTotal, feeBps_, BPS_DENOMINATOR);
        uint256 previousExecution = Math.mulDiv(previousFee, EXECUTION_SHARE_BPS, BPS_DENOMINATOR);
        uint256 newExecution = Math.mulDiv(newFee, EXECUTION_SHARE_BPS, BPS_DENOMINATOR);
        uint256 previousNonExecution = previousFee - previousExecution;
        uint256 newNonExecution = newFee - newExecution;
        uint256 previousPartner;
        uint256 newPartner;
        if (hasPartner) {
            previousPartner = Math.mulDiv(previousNonExecution, PARTNER_SHARE_BPS, BPS_DENOMINATOR);
            newPartner = Math.mulDiv(newNonExecution, PARTNER_SHARE_BPS, BPS_DENOMINATOR);
        }

        executionReward = newExecution - previousExecution;
        partnerReward = newPartner - previousPartner;
        treasuryFee = (newNonExecution - newPartner) - (previousNonExecution - previousPartner);
        ownerAmount = balance - (newFee - previousFee);
    }

    function _resolveOwner() internal view returns (address effectiveOwner) {
        address source = _getArgAddress(32);
        bytes32 key = _getArgBytes32(52);
        if (key == bytes32(0)) return source;
        if (source.code.length == 0) revert OwnerResolverUnavailable();

        (bool supportsSuccess, bytes memory supportsData) = source.staticcall{ gas: ERC165_GAS_LIMIT }(
            abi.encodeCall(IERC165.supportsInterface, (type(IGOTOwnerResolver).interfaceId))
        );
        if (!supportsSuccess || supportsData.length != 32 || abi.decode(supportsData, (uint256)) != 1)
            revert InvalidOwnerResolver();

        (bool resolveSuccess, bytes memory resolveData) = source.staticcall{ gas: OWNER_RESOLVER_GAS_LIMIT }(
            abi.encodeCall(IGOTOwnerResolver.resolveOwner, (address(this), key))
        );
        if (!resolveSuccess || resolveData.length != 32) revert OwnerResolutionFailed();
        uint256 resolvedWord = abi.decode(resolveData, (uint256));
        if (resolvedWord > type(uint160).max) revert InvalidResolvedOwner();
        effectiveOwner = address(uint160(resolvedWord));
        if (effectiveOwner == address(0)) return address(0);
        if (effectiveOwner == address(this) || effectiveOwner == source) revert InvalidResolvedOwner();
    }

    function _authorizeResolver(address executor) internal view {
        if (executor == address(0) || executor == address(this)) revert InvalidExecutor();
        address restrictedResolver = _getArgAddress(124);
        if (restrictedResolver != address(0) && executor != restrictedResolver) {
            revert UnauthorizedResolver();
        }
    }

    function _acquireLock() internal returns (uint256 state) {
        state = packedState;
        if (state & LOCK_BIT != 0) revert ReentrantExecution();
        packedState = state | LOCK_BIT;
    }

    function _validateProxyContext() internal view {
        if (address(this) == IMPLEMENTATION_SELF) revert DirectImplementationCall();
        uint256 size = msg.data.length;
        if (size < IMMUTABLE_ARGS_LENGTH + 2) revert DirectImplementationCall();
        uint256 suffixLength;
        assembly ("memory-safe") {
            suffixLength := shr(240, calldataload(sub(calldatasize(), 2)))
        }
        if (suffixLength != IMMUTABLE_ARGS_LENGTH) revert DirectImplementationCall();
    }

    function _immutableArgsOffset() private pure returns (uint256 offset) {
        assembly ("memory-safe") {
            offset := sub(calldatasize(), 228)
        }
    }

    function _getArgAddress(uint256 argOffset) private pure returns (address value) {
        uint256 offset = _immutableArgsOffset();
        assembly ("memory-safe") {
            value := shr(96, calldataload(add(offset, argOffset)))
        }
    }

    function _getArgBytes32(uint256 argOffset) private pure returns (bytes32 value) {
        uint256 offset = _immutableArgsOffset();
        assembly ("memory-safe") {
            value := calldataload(add(offset, argOffset))
        }
    }

    function _getArgUint(uint256 argOffset, uint256 shift) private pure returns (uint256 value) {
        uint256 offset = _immutableArgsOffset();
        assembly ("memory-safe") {
            value := shr(shift, calldataload(add(offset, argOffset)))
        }
    }
}
