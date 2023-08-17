// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "../core/MarkExchangeRouter.sol";

contract TestMarkExchangeRouter is MarkExchangeRouter {
    constructor(
        IMatchCriteriaRouter _matchCriteriaRouter,
        address _oracle,
        uint _blockRange,
        uint256 _maxPlatformFeeRate
    ) MarkExchangeRouter(
        _matchCriteriaRouter,
        _oracle,
        _blockRange,
        _maxPlatformFeeRate
    ) {}

    function checkOrderValidity(Order calldata order, bytes32 hash)
        external
        view
        returns (bool)
    {
        return _checkOrderValidity(order, hash);
    }

    function matchOrders(Order calldata sell, Order calldata buy)
        external
        view
        returns (uint256 price, uint256 tokenId, uint256 amount, AssetType assetType)
    {
        return _matchOrders(sell, buy);
    }

    function validateSignatures(SettlementInput calldata order, bytes32 orderHash)
        external
        view
        returns (bool)
    {
        return _validateSignatures(order, orderHash);
    }
}
