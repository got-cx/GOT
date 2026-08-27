// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IGOTFactory } from "../core/interfaces/IGOTFactory.sol";
import { IGOTIntent } from "../core/interfaces/IGOTIntent.sol";
import { IGOTOwnerResolver } from "../core/interfaces/IGOTOwnerResolver.sol";

/// @title GOTLens
/// @notice Reads canonical GOT intent state for many recovery configurations in one eth_call.
/// @dev Individual invalid or unavailable reads are reported through flags instead of reverting the batch.
contract GOTLens {
    uint256 public constant ERC20_BALANCE_GAS_LIMIT = 50_000;
    uint256 public constant INTENT_READ_GAS_LIMIT = 100_000;
    uint256 public constant ERC165_GAS_LIMIT = 30_000;
    uint256 public constant OWNER_RESOLVER_GAS_LIMIT = 50_000;

    IGOTFactory public immutable GOT_FACTORY;

    struct IntentSnapshot {
        address intentAddress;
        bool configValid;
        bool deployed;
        bool canonical;
        bool balanceRead;
        uint256 balance;
        bool stateRead;
        uint256 totalProcessed;
        bool ownerResolved;
        address effectiveOwner;
    }

    error InvalidFactory();

    constructor(address gotFactory_) {
        if (gotFactory_ == address(0) || gotFactory_.code.length == 0) revert InvalidFactory();
        GOT_FACTORY = IGOTFactory(gotFactory_);
    }

    function snapshot(IGOTFactory.IntentConfig calldata config) external view returns (IntentSnapshot memory result) {
        return _snapshot(config);
    }

    function snapshotMany(
        IGOTFactory.IntentConfig[] calldata configs
    ) external view returns (IntentSnapshot[] memory results) {
        results = new IntentSnapshot[](configs.length);
        for (uint256 i; i < configs.length; ++i) {
            results[i] = _snapshot(configs[i]);
        }
    }

    function _snapshot(IGOTFactory.IntentConfig calldata config) private view returns (IntentSnapshot memory result) {
        (result.configValid, result.intentAddress) = _preview(config);
        if (!result.configValid) return result;

        (result.balanceRead, result.balance) = _readUint(
            config.token,
            abi.encodeCall(IERC20.balanceOf, (result.intentAddress)),
            ERC20_BALANCE_GAS_LIMIT
        );
        result.deployed = result.intentAddress.code.length != 0;

        if (!result.deployed) {
            (result.ownerResolved, result.effectiveOwner) = _resolveCounterfactualOwner(config, result.intentAddress);
            return result;
        }

        (bool factoryRead, address intentFactory) = _readAddress(
            result.intentAddress,
            abi.encodeCall(IGOTIntent.factory, ()),
            INTENT_READ_GAS_LIMIT
        );
        result.canonical = factoryRead && intentFactory == address(GOT_FACTORY);
        if (!result.canonical) return result;

        (result.stateRead, result.totalProcessed) = _readUint(
            result.intentAddress,
            abi.encodeCall(IGOTIntent.totalProcessed, ()),
            INTENT_READ_GAS_LIMIT
        );
        (result.ownerResolved, result.effectiveOwner) = _readAddress(
            result.intentAddress,
            abi.encodeCall(IGOTIntent.owner, ()),
            INTENT_READ_GAS_LIMIT
        );
        if (result.effectiveOwner == address(0)) result.ownerResolved = false;
    }

    function _preview(
        IGOTFactory.IntentConfig calldata config
    ) private view returns (bool valid, address intentAddress) {
        (bool success, bytes memory data) = address(GOT_FACTORY).staticcall(
            abi.encodeCall(IGOTFactory.previewAddress, (config))
        );
        if (!success || data.length != 32) return (false, address(0));

        uint256 word = abi.decode(data, (uint256));
        if (word > type(uint160).max || word == 0) return (false, address(0));
        return (true, address(uint160(word)));
    }

    function _resolveCounterfactualOwner(
        IGOTFactory.IntentConfig calldata config,
        address intentAddress
    ) private view returns (bool resolved, address effectiveOwner) {
        if (config.ownerKey == bytes32(0)) return (true, config.ownerSource);
        if (config.ownerSource.code.length == 0) return (false, address(0));

        (bool supportsSuccess, bytes memory supportsData) = config.ownerSource.staticcall{ gas: ERC165_GAS_LIMIT }(
            abi.encodeCall(IERC165.supportsInterface, (type(IGOTOwnerResolver).interfaceId))
        );
        if (!supportsSuccess || supportsData.length != 32 || abi.decode(supportsData, (uint256)) != 1) {
            return (false, address(0));
        }

        (bool ownerRead, address owner) = _readAddress(
            config.ownerSource,
            abi.encodeCall(IGOTOwnerResolver.resolveOwner, (intentAddress, config.ownerKey)),
            OWNER_RESOLVER_GAS_LIMIT
        );
        if (!ownerRead || owner == address(0) || owner == intentAddress || owner == config.ownerSource) {
            return (false, address(0));
        }
        return (true, owner);
    }

    function _readAddress(
        address target,
        bytes memory callData,
        uint256 gasLimit
    ) private view returns (bool success, address value) {
        bytes memory data;
        (success, data) = target.staticcall{ gas: gasLimit }(callData);
        if (!success || data.length != 32) return (false, address(0));

        uint256 word = abi.decode(data, (uint256));
        if (word > type(uint160).max) return (false, address(0));
        return (true, address(uint160(word)));
    }

    function _readUint(
        address target,
        bytes memory callData,
        uint256 gasLimit
    ) private view returns (bool success, uint256 value) {
        bytes memory data;
        (success, data) = target.staticcall{ gas: gasLimit }(callData);
        if (!success || data.length != 32) return (false, 0);
        return (true, abi.decode(data, (uint256)));
    }
}
