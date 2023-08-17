// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

// is InputMatchingEngine
// import "@openzeppelin/contracts/access/Ownable.sol";

import "../utility/BulkSignVerifier.sol";
import "../types/EIP712DomainAndTypehash.sol";
import "./InputMatchingEngine.sol";
import "../types/MarkExchangeEvents.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

error BlockOutOfRange();
// error ZeroAddress();

contract InputValidator is EIP712DomainAndTypehash, InputMatchingEngine {

    using ECDSA for bytes32;

    //constants
    string private constant NAME = "Mark Exchange";
    string private constant VERSION = "1.0";
    bytes1 private constant CHECK_ORACLE_SIGN = 0x01;

    //variables
    address public oracle;
    uint256 public blockRange;

    /* Storage */
    mapping(bytes32 => bool) internal cancelledOrFilled;
    mapping(address => uint256) internal nonces;


    constructor(
        IMatchCriteriaRouter _matchCriteriaRouter,
        address _oracle,
        uint _blockRange,
        uint256 _maxPlatformFeeRate
        ) InputMatchingEngine (
        _matchCriteriaRouter,
        _maxPlatformFeeRate
    ) {
        _addressNotZero(_oracle);
        // Derive name and version hashes alongside required EIP-712 typehashes.
        DOMAIN_SEPARATOR = _hashDomain(EIP712Domain({
            name              : NAME,
            version           : VERSION,
            chainId           : block.chainid,
            verifyingContract : address(this)
        }));
    
        oracle = _oracle;
        blockRange = _blockRange;
    }


    function _setOracle(address _oracle)
        internal
    {
        _addressNotZero(_oracle);
        oracle = _oracle;
        emit NewOracle(oracle);
    }

    function _setBlockRange(uint256 _blockRange)
        internal
    {
        blockRange = _blockRange;
        emit NewBlockRange(blockRange);
    }

    /**
     * @dev Validite order parameters
     * @param order order
     * @param orderHash hash of order
     */
    function _checkOrderValidity(Order calldata order, bytes32 orderHash)
        internal
        view
        returns (bool)
    {
        bool isCancelledOrFilled = cancelledOrFilled[orderHash];
        bool isSettleable = (order.listingTime < block.timestamp) && (block.timestamp < order.expirationTime);
        return (order.trader != address(0)) && !isCancelledOrFilled && isSettleable;
    }

    /**
     * @dev Verify the signatures
     * @param order order
     * @param orderHash hash of order
     */
    function _validateSignatures(SettlementInput calldata order, bytes32 orderHash)
        internal
        view
        returns (bool)
    {
        if (order.order.trader == msg.sender) {
          return true;
        } else {
            if (order.order.extraParams.length > 0 && order.order.extraParams[0] == CHECK_ORACLE_SIGN) {
                // Check oracle authorization
                if(block.number - order.blockNumber >= blockRange) revert BlockOutOfRange();
                if (
                    !_validateOracleAuthorization(
                        orderHash,
                        order.signatureVersion,
                        order.extraSignature,
                        order.blockNumber
                    )
                ) {
                    return false;
                }
            }

            // Check user authorization
            if (
                !_validateUserAuthorization(
                    orderHash,
                    order.order.trader,
                    order.v,
                    order.r,
                    order.s,
                    order.signatureVersion,
                    order.extraSignature
                )
            ) {
                return false;
            }
        }

        return true;
    }

       /**
     * @dev Verify user signature
     * @param orderHash hash of the order
     * @param trader order trader who should be the signer
     * @param v v
     * @param r r
     * @param s s
     * @param signatureVersion signature version
     * @param extraSignature packed merkle path
     */
    function _validateUserAuthorization(
        bytes32 orderHash,
        address trader,
        uint8 v,
        bytes32 r,
        bytes32 s,
        SignatureVersion signatureVersion,
        bytes calldata extraSignature
    ) internal view returns (bool) {
        bytes32 hashToSign;
        if (signatureVersion == SignatureVersion.Single) {
            /* Single-listing authentication: Order signed by trader */
            hashToSign = _hashToSign(orderHash);
        } else if (signatureVersion == SignatureVersion.Bulk) {
            /* Bulk-listing authentication: Merkle root of orders signed by trader */
            (bytes32[] memory merklePath) = abi.decode(extraSignature, (bytes32[]));

            bytes32 computedRoot = BulkSignVerifier._computeMerkleRoot(orderHash, merklePath);
            hashToSign = _hashToSignRoot(computedRoot);
        }

        return _verifyEcSig(trader, hashToSign, v, r, s);
    }

    /**
     * @dev Verify oracle signature
     * @param orderHash hash of the order
     * @param signatureVersion signature version
     * @param extraSignature packed oracle signature
     * @param blockNumber block number used in oracle signature
     */
    function _validateOracleAuthorization(
        bytes32 orderHash,
        SignatureVersion signatureVersion,
        bytes calldata extraSignature,
        uint256 blockNumber
    ) internal view returns (bool) {
        bytes32 oracleHash = _hashToSignOracle(orderHash, blockNumber);

        uint8 v; bytes32 r; bytes32 s;
        if (signatureVersion == SignatureVersion.Single) {
            assembly {
                v := calldataload(extraSignature.offset)
                r := calldataload(add(extraSignature.offset, 0x20))
                s := calldataload(add(extraSignature.offset, 0x40))
            }
            /*
            REFERENCE
            (v, r, s) = abi.decode(extraSignature, (uint8, bytes32, bytes32));
            */
        } else if (signatureVersion == SignatureVersion.Bulk) {
            /* If the signature was a bulk listing the merkle path must be unpacked before the oracle signature. */
            assembly {
                v := calldataload(add(extraSignature.offset, 0x20))
                r := calldataload(add(extraSignature.offset, 0x40))
                s := calldataload(add(extraSignature.offset, 0x60))
            }
            /*
            REFERENCE
            uint8 _v, bytes32 _r, bytes32 _s;
            (bytes32[] memory merklePath, uint8 _v, bytes32 _r, bytes32 _s) = abi.decode(extraSignature, (bytes32[], uint8, bytes32, bytes32));
            v = _v; r = _r; s = _s;
            */
        }

        return _verifyEcSig(oracle, oracleHash, v, r, s);
    }

    /**
     * @dev Verify ECDSA signature
     * @param signer Expected signer
     * @param digest Signature preimage
     * @param v v
     * @param r r
     * @param s s
     */
    function _verifyEcSig(
        address signer,
        bytes32 digest,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (bool) {
        // if(signer == address(0)) revert ZeroAddress();
        // assembly {
        //     if iszero(signer) {
        //         let ptr := mload(0x40)
        //         mstore(ptr, 0xd92e233d00000000000000000000000000000000000000000000000000000000) // selector for `ZeroAddress()`
        //         revert(ptr, 0x4)
        //     }
        // }
        _addressNotZero(signer);
        return (v == 27 || v == 28) && signer == ECDSA.recover(digest, v, r, s);
    }

} 
