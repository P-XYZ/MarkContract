// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Order, AssetType} from "../types/MarkExchangeDataTypes.sol";
import {IMatchingCriteria} from "../interfaces/IMatchingCriteria.sol";

/**
 * @title MatchCriteriaERC721ExtraParam
 * @dev Criteria for matching orders at a fixed price for a specific ERC721 tokenId (requires oracle authorization on both orders)
 */
contract MatchCriteriaERC721ExtraParam is IMatchingCriteria {
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
            (makerAsk.extraParams.length > 0 && makerAsk.extraParams[0] == "\x01") &&
            (takerBid.extraParams.length > 0 && takerBid.extraParams[0] == "\x01") &&
            (makerAsk.amount == 1) &&
            (takerBid.amount == 1) &&
            (makerAsk.matchingCriteria == takerBid.matchingCriteria) &&
            (makerAsk.price == takerBid.price),
            makerAsk.price,
            makerAsk.tokenId,
            1,
            AssetType.ERC721
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
            (makerBid.extraParams.length > 0 && makerBid.extraParams[0] == "\x01") &&
            (takerAsk.extraParams.length > 0 && takerAsk.extraParams[0] == "\x01") &&
            (makerBid.amount == 1) &&
            (takerAsk.amount == 1) &&
            (makerBid.matchingCriteria == takerAsk.matchingCriteria) &&
            (makerBid.price == takerAsk.price),
            makerBid.price,
            makerBid.tokenId,
            1,
            AssetType.ERC721
        );
    }
}

