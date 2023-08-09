// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// is inputsettlement
// import "@openzeppelin/contracts/access/Ownable.sol";


import "../interfaces/IMatchCriteriaRouter.sol";
import "../interfaces/IMatchingCriteria.sol";
import "./InputSettlement.sol";

// error ZeroAddress();
error OrderCannotMatch();
error MatchCriteriaNotGranted();

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
        _addressNotZero(address(_matchCriteriaRouter));
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

        if(!matchCriteriaRouter.isCriteriaGranted(address(matchingCriteria))) revert MatchCriteriaNotGranted();
        (bool canMatch, uint256 _price, uint256 _tokenId, uint256 _amount, AssetType _assetType) = sell.listingTime <= buy.listingTime ? matchingCriteria.matchMakerAsk(sell, buy) : matchingCriteria.matchMakerBid(buy, sell);
        if (!canMatch) revert OrderCannotMatch();

        price = _price;
        tokenId = _tokenId;
        amount = _amount;
        assetType = _assetType;
        return (price, tokenId, amount, assetType);

    }
}
