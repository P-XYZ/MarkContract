// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// is inputsettlement
// import "@openzeppelin/contracts/access/Ownable.sol";


import "../interfaces/IMatchCriteriaRouter.sol";
import "../interfaces/IMatchingCriteria.sol";
import "./InputSettlement.sol";

contract InputMatchingEngine is InputSettlement {

    IMatchCriteriaRouter public matchCriteriaRouter;

    constructor(
        IMatchCriteriaRouter _matchCriteriaRouter,
        uint256 _maxPlatformFeeRate
        ) InputSettlement (
        _maxPlatformFeeRate
    ) {
        matchCriteriaRouter = _matchCriteriaRouter;
    }

    function _setMatchCriteriaRouter(IMatchCriteriaRouter _matchCriteriaRouter) internal
    {
        require(address(_matchCriteriaRouter) != address(0), "MarkExchange: Address cannot be zero");
        matchCriteriaRouter = _matchCriteriaRouter;
        emit NewMatchCriteriaRouter(matchCriteriaRouter);
    }
    
    /**
     * @dev Call the matching Criteria to check orders can be matched and get execution parameters
     * @param sell sell order
     * @param buy buy order
     */
    function _matchOrders(Order calldata sell, Order calldata buy)
        internal
        view
        returns (uint256 price, uint256 tokenId, uint256 amount, AssetType assetType)
    {
        IMatchingCriteria matchingCriteria;
        if (sell.listingTime <= buy.listingTime) {
            /* Seller is maker. */
            matchingCriteria = IMatchingCriteria(sell.matchingCriteria);
        } else {
            /* Buyer is maker. */
            matchingCriteria = IMatchingCriteria(buy.matchingCriteria);
        }
        require(matchCriteriaRouter.isCriteriaGranted(address(matchingCriteria)), "MarkExchange: Matching Criteria is not granted");
        (bool canMatch, uint256 _price, uint256 _tokenId, uint256 _amount, AssetType _assetType) = sell.listingTime <= buy.listingTime ? matchingCriteria.matchMakerAsk(sell, buy) : matchingCriteria.matchMakerBid(buy, sell);
        require(canMatch, "MarkExchange: Orders cannot be matched");

        price = _price;
        tokenId = _tokenId;
        amount = _amount;
        assetType = _assetType;
        return (price, tokenId, amount, assetType);

    }
}
