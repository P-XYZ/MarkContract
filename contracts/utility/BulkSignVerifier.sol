// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

/**
 * @title BulkSignVerifier
 * @dev Utility functions for Merkle tree computations
 */
library BulkSignVerifier {
    /**
     * @dev Verify the bulk sign proof
     * @param leaf leaf
     * @param root root
     * @param proof proof
     */
    function _verifyBulkSignProof(
        bytes32 leaf,
        bytes32 root,
        bytes32[] memory proof
    ) internal pure {
        bytes32 computedRoot = _computeMerkleRoot(leaf, proof);
        require(computedRoot == root, "BulkSign: InvalidProof");
    }

    /**
     * @dev Compute the merkle root
     * @param leaf leaf
     * @param proof proof
     */
    function _computeMerkleRoot(
        bytes32 leaf,
        bytes32[] memory proof
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; ++i) {
            bytes32 proofElement = proof[i];
            computedHash = _hashPair(computedHash, proofElement);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(
        bytes32 a,
        bytes32 b
    ) private pure returns (bytes32 value) {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}
