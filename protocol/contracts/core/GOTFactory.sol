// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IGOTFactory } from "./interfaces/IGOTFactory.sol";
import { IGOTIntent } from "./interfaces/IGOTIntent.sol";
import { GOTClones } from "./libraries/GOTClones.sol";

/// @title GOTFactory
/// @notice Stateless canonical factory for previewing, deploying, and executing GOT intents.
contract GOTFactory is IGOTFactory {
    bytes32 public constant PROTOCOL_VERSION = keccak256("GOT_PROTOCOL_V0_2");
    uint16 public constant IMMUTABLE_ARGS_LENGTH = 226;
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    address public immutable IMPLEMENTATION;
    address public immutable TREASURY;
    uint16 public immutable EXECUTION_SHARE_BPS;
    uint16 public immutable PARTNER_SHARE_BPS;
    uint16 public immutable MAX_FEE_BPS;

    event IntentDeployed(bytes32 indexed configHash, address indexed intentAddress, address indexed executor);

    error InvalidConfiguration();
    error InvalidToken();
    error UnexpectedDeploymentAddress();

    constructor(
        address implementation_,
        address treasury_,
        uint16 executionShareBps_,
        uint16 partnerShareBps_,
        uint16 maxFeeBps_
    ) {
        if (
            implementation_ == address(0) ||
            implementation_.code.length == 0 ||
            treasury_ == address(0) ||
            executionShareBps_ == 0 ||
            executionShareBps_ >= BPS_DENOMINATOR ||
            partnerShareBps_ == 0 ||
            partnerShareBps_ >= BPS_DENOMINATOR ||
            maxFeeBps_ == 0 ||
            maxFeeBps_ >= BPS_DENOMINATOR
        ) revert InvalidConfiguration();
        if (!_implementationMatches(implementation_, treasury_, executionShareBps_, partnerShareBps_))
            revert InvalidConfiguration();

        IMPLEMENTATION = implementation_;
        TREASURY = treasury_;
        EXECUTION_SHARE_BPS = executionShareBps_;
        PARTNER_SHARE_BPS = partnerShareBps_;
        MAX_FEE_BPS = maxFeeBps_;
    }

    function configHash(IntentConfig calldata config) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    config.intentId,
                    config.ownerSource,
                    config.ownerKey,
                    config.token,
                    config.partner,
                    config.authorizedResolver,
                    config.amount,
                    config.initialDeadline,
                    config.period,
                    config.feeBps,
                    config.metadataHash
                )
            );
    }

    function previewAddress(IntentConfig calldata config) public view returns (address intentAddress) {
        _validate(config);
        bytes32 salt = _salt(config);
        intentAddress = GOTClones.predictDeterministicAddress(
            IMPLEMENTATION,
            _immutableArgs(config),
            salt,
            address(this)
        );
        _validateDerivedAddress(config, intentAddress);
    }

    function quoteOwnerAmount(uint256 grossAmount, uint16 feeBps_) public pure returns (uint256) {
        if (feeBps_ >= BPS_DENOMINATOR) revert InvalidConfiguration();
        return grossAmount - Math.mulDiv(grossAmount, feeBps_, BPS_DENOMINATOR);
    }

    function quoteGrossAmount(uint256 recipientAmount, uint16 feeBps_) public pure returns (uint256 gross) {
        if (feeBps_ >= BPS_DENOMINATOR) revert InvalidConfiguration();
        if (feeBps_ == 0 || recipientAmount == 0) return recipientAmount;

        // owner(gross) = ceil(gross * (10_000 - fee) / 10_000). The
        // first gross value mapping to a nonzero recipient amount is therefore:
        // floor((recipientAmount - 1) * 10_000 / (10_000 - fee)) + 1.
        gross = Math.mulDiv(recipientAmount - 1, BPS_DENOMINATOR, BPS_DENOMINATOR - feeBps_) + 1;
        if (quoteOwnerAmount(gross, feeBps_) != recipientAmount) revert InvalidConfiguration();
    }

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
        )
    {
        intentAddress = previewAddress(config);
        if (config.token.code.length == 0) revert InvalidToken();

        if (intentAddress.code.length == 0) {
            bytes32 salt = _salt(config);
            address deployed = GOTClones.cloneDeterministic(IMPLEMENTATION, _immutableArgs(config), salt);
            if (deployed != intentAddress) revert UnexpectedDeploymentAddress();
            emit IntentDeployed(configHash(config), intentAddress, msg.sender);
        }

        (, , processedAmount, ownerAmount, treasuryFee, partnerReward, executionReward) = IGOTIntent(intentAddress)
            .executeFor(msg.sender);
    }

    function _validate(IntentConfig calldata config) internal view {
        if (
            config.ownerSource == address(0) ||
            config.token == address(0) ||
            config.amount == 0 ||
            config.feeBps > MAX_FEE_BPS ||
            (config.period != 0 && config.initialDeadline == 0) ||
            _isIntentSelector(bytes4(config.intentId))
        ) revert InvalidConfiguration();
    }

    /// @dev Empty external calldata is followed immediately by immutable args in
    /// the clone delegatecall. Rejecting every declared implementation selector
    /// keeps native transfers on the payable fallback instead of dispatching to
    /// a nonpayable function whose selector matches the intentId prefix.
    function _isIntentSelector(bytes4 selector) internal pure returns (bool) {
        return
            selector == bytes4(keccak256("ERC165_GAS_LIMIT()")) ||
            selector == bytes4(keccak256("EXECUTION_SHARE_BPS()")) ||
            selector == bytes4(keccak256("IMMUTABLE_ARGS_LENGTH()")) ||
            selector == bytes4(keccak256("OWNER_RESOLVER_GAS_LIMIT()")) ||
            selector == bytes4(keccak256("PARTNER_SHARE_BPS()")) ||
            selector == bytes4(keccak256("PROTOCOL_VERSION()")) ||
            selector == bytes4(keccak256("TREASURY()")) ||
            selector == IGOTIntent.amount.selector ||
            selector == IGOTIntent.authorizedResolver.selector ||
            selector == IGOTIntent.executeFor.selector ||
            selector == IGOTIntent.factory.selector ||
            selector == IGOTIntent.feeBps.selector ||
            selector == IGOTIntent.initialDeadline.selector ||
            selector == IGOTIntent.intentId.selector ||
            selector == IGOTIntent.metadataHash.selector ||
            selector == IGOTIntent.owner.selector ||
            selector == IGOTIntent.ownerKey.selector ||
            selector == IGOTIntent.ownerSource.selector ||
            selector == IGOTIntent.partner.selector ||
            selector == IGOTIntent.period.selector ||
            selector == IGOTIntent.recoverERC20.selector ||
            selector == IGOTIntent.recoverNative.selector ||
            selector == IGOTIntent.resolve.selector ||
            selector == IGOTIntent.settle.selector ||
            selector == IGOTIntent.token.selector ||
            selector == IGOTIntent.totalProcessed.selector;
    }

    function _validateDerivedAddress(IntentConfig calldata config, address intentAddress) internal view {
        if (
            config.ownerSource == intentAddress ||
            config.token == intentAddress ||
            (config.partner != address(0) && config.partner == intentAddress) ||
            (config.authorizedResolver != address(0) && config.authorizedResolver == intentAddress) ||
            TREASURY == intentAddress
        ) revert InvalidConfiguration();
    }

    function _salt(IntentConfig calldata config) internal pure returns (bytes32) {
        return keccak256(abi.encode(PROTOCOL_VERSION, configHash(config)));
    }

    function _immutableArgs(IntentConfig calldata config) internal view returns (bytes memory args) {
        args = abi.encodePacked(
            config.intentId,
            config.ownerSource,
            config.ownerKey,
            config.token,
            config.partner,
            config.authorizedResolver,
            config.amount,
            config.initialDeadline,
            config.period,
            config.feeBps,
            config.metadataHash,
            address(this)
        );
        assert(args.length == IMMUTABLE_ARGS_LENGTH);
    }

    function _implementationMatches(
        address implementation_,
        address treasury_,
        uint16 executionShareBps_,
        uint16 partnerShareBps_
    ) internal view returns (bool) {
        (bool treasuryOk, uint256 implementationTreasury) = _readUint(implementation_, bytes4(keccak256("TREASURY()")));
        (bool executionOk, uint256 implementationExecutionShare) = _readUint(
            implementation_,
            bytes4(keccak256("EXECUTION_SHARE_BPS()"))
        );
        (bool partnerOk, uint256 implementationPartnerShare) = _readUint(
            implementation_,
            bytes4(keccak256("PARTNER_SHARE_BPS()"))
        );
        (bool versionOk, uint256 implementationVersion) = _readUint(
            implementation_,
            bytes4(keccak256("PROTOCOL_VERSION()"))
        );
        (bool lengthOk, uint256 implementationArgsLength) = _readUint(
            implementation_,
            bytes4(keccak256("IMMUTABLE_ARGS_LENGTH()"))
        );
        return
            treasuryOk &&
            executionOk &&
            partnerOk &&
            versionOk &&
            lengthOk &&
            implementationTreasury == uint160(treasury_) &&
            implementationExecutionShare == executionShareBps_ &&
            implementationPartnerShare == partnerShareBps_ &&
            implementationVersion == uint256(PROTOCOL_VERSION) &&
            implementationArgsLength == IMMUTABLE_ARGS_LENGTH;
    }

    function _readUint(address target, bytes4 selector) internal view returns (bool ok, uint256 value) {
        bytes memory result;
        (ok, result) = target.staticcall(abi.encodeWithSelector(selector));
        if (!ok || result.length != 32) return (false, 0);
        value = abi.decode(result, (uint256));
    }
}
