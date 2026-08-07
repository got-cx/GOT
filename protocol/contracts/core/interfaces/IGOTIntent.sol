// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IGOTIntent {
    function settle()
        external
        returns (
            address executor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        );

    function resolve()
        external
        returns (
            address executor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        );

    function executeFor(
        address executor
    )
        external
        returns (
            address authorizedExecutor,
            address effectiveOwner,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        );

    function owner() external view returns (address);
    function totalProcessed() external view returns (uint256);
    function intentId() external view returns (bytes32);
    function ownerSource() external view returns (address);
    function ownerKey() external view returns (bytes32);
    function token() external view returns (address);
    function partner() external view returns (address);
    function authorizedResolver() external view returns (address);
    function amount() external view returns (uint128);
    function initialDeadline() external view returns (uint64);
    function period() external view returns (uint32);
    function feeBps() external view returns (uint16);
    function metadataHash() external view returns (bytes32);
    function factory() external view returns (address);
    function recoverERC20(address asset) external returns (uint256);
    function recoverNative() external returns (uint256);
}
