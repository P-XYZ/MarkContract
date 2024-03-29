// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Order, AssetType} from "../types/MarkExchangeDataTypes.sol";
import {IMatchingCriteria} from "../interfaces/IMatchingCriteria.sol";

/**
 * @title MatchCriteriaERC1155
 * @dev Criteria for matching orders at a fixed price for a specific ERC1155 tokenId
 */
contract MatchCriteriaERC1155 is IMatchingCriteria {
    function matchMakerAsk(Order calldata makerAsk, Order calldata takerBid)
        external
        pure
        override
        returns (
            bool,
            uint256,
            uint256,
            uint256,
            AssetType
        )
    {
        return (
            (makerAsk.side != takerBid.side) &&
            (makerAsk.paymentToken == takerBid.paymentToken) &&
            (makerAsk.collection == takerBid.collection) &&
            (makerAsk.tokenId == takerBid.tokenId) &&
            (makerAsk.amount == takerBid.amount) &&
            (makerAsk.matchingCriteria == takerBid.matchingCriteria) &&
            (makerAsk.price == takerBid.price),
            makerAsk.price,
            makerAsk.tokenId,
            makerAsk.amount,
            AssetType.ERC1155
        );
    }

    function matchMakerBid(Order calldata makerBid, Order calldata takerAsk)
        external
        pure
        override
        returns (
            bool,
            uint256,
            uint256,
            uint256,
            AssetType
        )
    {
        return (
            (makerBid.side != takerAsk.side) &&
            (makerBid.paymentToken == takerAsk.paymentToken) &&
            (makerBid.collection == takerAsk.collection) &&
            (makerBid.tokenId == takerAsk.tokenId) &&
            (makerBid.amount == takerAsk.amount) &&
            (makerBid.matchingCriteria == takerAsk.matchingCriteria) &&
            (makerBid.price == takerAsk.price),
            makerBid.price,
            makerBid.tokenId,
            makerBid.amount,
            AssetType.ERC1155
        );
    }
}
