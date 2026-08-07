// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.28;

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

/// @notice Deterministic clones using GOT's canonical calldata-appending runtime.
/// @dev OpenZeppelin Clones stores immutable args in runtime bytecode but does
/// not append them to delegatecall calldata. GOT requires:
/// original calldata || immutable args || uint16_be(args.length).
/// Runtime design derived from ClonesWithImmutableArgs by wighawag,
/// zefram.eth, and nick.eth (BSD-3-Clause); deployment uses OpenZeppelin Create2.
library GOTClones {
    error CloneArgumentsTooLong();

    uint256 private constant MAX_ARGS_LENGTH = type(uint16).max - 55;
    uint256 private constant RUNTIME_PREFIX_LENGTH = 55;

    function creationCode(address implementation, bytes memory args) internal pure returns (bytes memory) {
        if (args.length > MAX_ARGS_LENGTH) revert CloneArgumentsTooLong();

        uint256 extraLength = args.length + 2;
        uint256 runtimeLength = RUNTIME_PREFIX_LENGTH + extraLength;
        return
            abi.encodePacked(
                hex"61",
                uint16(runtimeLength),
                hex"3d81600a3d39f3",
                hex"3d3d3d3d363d3d37",
                hex"61",
                uint16(extraLength),
                hex"6037363936",
                hex"61",
                uint16(extraLength),
                hex"013d73",
                implementation,
                hex"5af43d3d93803e603557fd5bf3",
                args,
                uint16(args.length)
            );
    }

    function predictDeterministicAddress(
        address implementation,
        bytes memory args,
        bytes32 salt,
        address deployer
    ) internal pure returns (address) {
        return Create2.computeAddress(salt, keccak256(creationCode(implementation, args)), deployer);
    }

    function cloneDeterministic(address implementation, bytes memory args, bytes32 salt) internal returns (address) {
        return Create2.deploy(0, salt, creationCode(implementation, args));
    }
}
