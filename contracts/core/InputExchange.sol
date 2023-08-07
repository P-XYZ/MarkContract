// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// is InputValidator

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./InputValidator.sol";

error ExchangeOpened();
error ExchangeClosed();
error FailedAuthorization();
error InvalidOrderParam();
error InvalidOrderSide();
error OnlyInternalCall();
error OnlyExternalCall();

contract InputExchange is ReentrancyGuard, InputValidator {

    //constant
    uint256 private constant EXCHANGE_OPEN = 0xCAFE;
    uint256 private constant EXCHANGE_CLOSE = 0xF00D;

    //variable
    bool public isInternalCall;
    // uint256 public remainingETH = 0;
    bool public exchangeStatusOpen;

    modifier exchangeOpen() {
        if(!exchangeStatusOpen) revert ExchangeClosed();
        _;
    }

    modifier accrueETHDust() {
        if(isInternalCall) revert OnlyExternalCall();
        remainingETH = msg.value;
        isInternalCall = true;
        _;
        remainingETH = 0;
        isInternalCall = false;
    }

    constructor(
        IMatchCriteriaRouter _matchCriteriaRouter,
        address _oracle,
        uint _blockRange,
        uint256 _maxPlatformFeeRate
    ) InputValidator (
        _matchCriteriaRouter,
        _oracle,
        _blockRange,
        _maxPlatformFeeRate
    ) {
    }

    /**
     * @dev Settle two orders: validation, match, and execute payment token and nft asset transfer
     * @param sell Sell SettlementInput
     * @param buy Buy SettlementInput
     */
    function _settleExchangeInputs(SettlementInput calldata sell, SettlementInput calldata buy)
        public
        payable
        nonReentrant
    {
        if(!isInternalCall) revert OnlyInternalCall();
        if(sell.order.side != Side.Sell || buy.order.side != Side.Buy) revert InvalidOrderSide();

        bytes32 sellHash = _hashOrder(sell.order, nonces[sell.order.trader]);
        bytes32 buyHash = _hashOrder(buy.order, nonces[buy.order.trader]);

        if(!_checkOrderValidity(sell.order, sellHash) || !_checkOrderValidity(buy.order, buyHash)) revert InvalidOrderParam();
        if(!_validateSignatures(sell, sellHash) || !_validateSignatures(buy, buyHash)) revert FailedAuthorization();
        
        (uint256 price, uint256 tokenId, uint256 amount, AssetType assetType) = _matchOrders(sell.order, buy.order);

        // Mark orders as filled
        cancelledOrFilled[sellHash] = true;
        cancelledOrFilled[buyHash] = true;

        _effectFundsTransfer(
            sell.order.trader,
            buy.order.trader,
            sell.order.paymentToken,
            sell.order.fees,
            buy.order.fees,
            price
        );
        _effectNFTTransfer(
            sell.order.collection,
            sell.order.trader,
            buy.order.trader,
            tokenId,
            amount,
            assetType
        );

        emit OrdersMatched(
            sell.order.listingTime <= buy.order.listingTime ? sell.order.trader : buy.order.trader,
            sell.order.listingTime > buy.order.listingTime ? sell.order.trader : buy.order.trader,
            sell.order,
            sellHash,
            buy.order,
            buyHash
        );

    }
    
    /**
     * @dev Return remaining ETH sent to bulkESettlement or settlement
     */
    function _returnDust() internal {
        uint256 _remainingETH = remainingETH;
        assembly {
            if gt(_remainingETH, 0) {
                let callStatus := call(
                    gas(),
                    caller(),
                    _remainingETH,
                    0,
                    0,
                    0,
                    0
                )
                if iszero(callStatus) {
                  revert(0, 0)
                }
            }
        }
    }

    function _openExchange() internal {
        if(exchangeStatusOpen) revert ExchangeOpened();
        exchangeStatusOpen = true;
        emit Opened();
    }
    function _closeExchange() internal {
        if(!exchangeStatusOpen) revert ExchangeClosed();
        exchangeStatusOpen = false;
        emit Closed();
    }
}
