// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

interface IGOTFactory {
    struct IntentConfig {
        bytes32 intentId;
        address ownerSource;
        bytes32 ownerKey;
        address token;
        address partner;
        address authorizedResolver;
        uint128 amount;
        uint64 initialDeadline;
        uint32 period;
        uint16 feeBps;
        bytes32 metadataHash;
    }

    function configHash(IntentConfig calldata config) external pure returns (bytes32);

    function previewAddress(IntentConfig calldata config) external view returns (address);

    function quoteOwnerAmount(uint256 grossAmount, uint16 feeBps) external pure returns (uint256);

    function quoteGrossAmount(uint256 recipientAmount, uint16 feeBps) external pure returns (uint256);

    function deployAndExecute(
        IntentConfig calldata config
    )
        external
        returns (
            address intentAddress,
            uint256 processedAmount,
            uint256 ownerAmount,
            uint256 treasuryFee,
            uint256 partnerReward,
            uint256 executionReward
        );
}
