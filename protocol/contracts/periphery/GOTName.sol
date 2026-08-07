// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IGOTOwnerResolver } from "../core/interfaces/IGOTOwnerResolver.sol";
import { IGOTName } from "./interfaces/IGOTName.sol";

/// @title GOTName
/// @notice Optional reusable, opaque name-key ownership resolver for GOT intents.
contract GOTName is EIP712, ReentrancyGuard, IGOTOwnerResolver {
    struct Claim {
        bytes32 nameKey;
        address account;
        uint48 deadline;
    }

    bytes32 public constant CLAIM_TYPEHASH = keccak256("Claim(bytes32 nameKey,address account,uint48 deadline)");

    address public immutable CLAIM_VERIFIER;
    mapping(bytes32 nameKey => address account) private _accountOf;

    event NameClaimed(bytes32 indexed nameKey, address indexed account);
    event NameTransferred(bytes32 indexed nameKey, address indexed previousAccount, address indexed newAccount);

    error InvalidNameKey();
    error InvalidAccount();
    error ClaimExpired();
    error AlreadyClaimed();
    error NameNotClaimed();
    error InvalidVerifierSignature();
    error Unauthorized();

    constructor(address claimVerifier_) EIP712("GOTName", "1") {
        if (claimVerifier_ == address(0)) revert InvalidAccount();
        CLAIM_VERIFIER = claimVerifier_;
    }

    function accountOf(bytes32 nameKey) external view returns (address) {
        return _accountOf[nameKey];
    }

    function resolveOwner(address, bytes32 nameKey) external view returns (address) {
        return _accountOf[nameKey];
    }

    function claim(Claim calldata claimData, bytes calldata verifierSignature) external nonReentrant {
        if (claimData.nameKey == bytes32(0)) revert InvalidNameKey();
        if (claimData.account == address(0) || claimData.account == address(this)) {
            revert InvalidAccount();
        }
        if (block.timestamp > claimData.deadline) revert ClaimExpired();
        if (_accountOf[claimData.nameKey] != address(0)) revert AlreadyClaimed();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, claimData.nameKey, claimData.account, claimData.deadline))
        );
        if (!SignatureChecker.isValidSignatureNow(CLAIM_VERIFIER, digest, verifierSignature)) {
            revert InvalidVerifierSignature();
        }

        _accountOf[claimData.nameKey] = claimData.account;
        emit NameClaimed(claimData.nameKey, claimData.account);
    }

    function transfer(bytes32 nameKey, address newAccount) external nonReentrant {
        if (nameKey == bytes32(0)) revert InvalidNameKey();
        if (newAccount == address(0) || newAccount == address(this)) revert InvalidAccount();
        address previousAccount = _accountOf[nameKey];
        if (previousAccount == address(0)) revert NameNotClaimed();
        if (msg.sender != previousAccount) revert Unauthorized();

        _accountOf[nameKey] = newAccount;
        emit NameTransferred(nameKey, previousAccount, newAccount);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IGOTName).interfaceId ||
            interfaceId == type(IGOTOwnerResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
