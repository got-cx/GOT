// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ReentrantERC20 is MockERC20 {
    address public callbackFrom;
    address public callbackTarget;
    bytes public callbackData;
    bool public callbackAttempted;
    bool public callbackSucceeded;

    function setCallback(address target, bytes calldata data) external {
        callbackFrom = target;
        callbackTarget = target;
        callbackData = data;
    }

    function setCallbackFrom(address from, address target, bytes calldata data) external {
        callbackFrom = from;
        callbackTarget = target;
        callbackData = data;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (callbackTarget != address(0) && from == callbackFrom && !callbackAttempted) {
            callbackAttempted = true;
            (callbackSucceeded, ) = callbackTarget.call(callbackData);
        }
        super._update(from, to, value);
    }
}
