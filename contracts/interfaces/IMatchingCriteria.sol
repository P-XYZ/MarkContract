// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Order, AssetType} from "../types/MarkExchangeDataTypes.sol";

interface IMatchingCriteria {
    function matchMakerAsk(Order calldata makerAsk, Order calldata takerBid)
        external
        view
        returns (
            bool,
            uint256,
            uint256,
            uint256,
            AssetType
        );

    function matchMakerBid(Order calldata makerBid, Order calldata takerAsk)
        external
        view
        returns (
            bool,
            uint256,
            uint256,
            uint256,
            AssetType
        );
}
