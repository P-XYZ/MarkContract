// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

//is IMarkExchangeInput and InputMatchingEngine
import "./InputExchange.sol";
import "../interfaces/IMarkExchange.sol";

error OrderCancelledOrFilled();
error NotOrderTrader();

contract MarkExchangeInput is IMarkExchange, InputExchange {
    
    constructor(
        IMatchCriteriaRouter _matchCriteriaRouter,
        address _oracle,
        uint _blockRange,
        uint256 _maxPlatformFeeRate
    ) InputExchange(
        _matchCriteriaRouter,
        _oracle,
        _blockRange,
        _maxPlatformFeeRate
    ) {}

    /**
     * @dev settle sell buy orders: validation, match and settlement
     * @param sell Sell SettlementInput
     * @param buy Buy SettlementInput
     */
    function settleExchangeInputs(SettlementInput calldata sell, SettlementInput calldata buy)
        external
        payable
        exchangeOpen
        accrueETHDust
    {
        _settleExchangeInputs(sell, buy);
        _returnDust();  //TODO: to change name
    }

    /**
     * @dev Bulk settle sell buy orders:
     * @param settlements buy/sell matches
     */
    function bulksettleExchangeInputs(Settlement[] calldata settlements)
        external
        payable
        exchangeOpen
        accrueETHDust
    {
        uint256 settlementLength = settlements.length;
        for (uint256 i=0; i < settlementLength; ++i) {
            _settleExchangeInputs(settlements[i].sell, settlements[i].buy);
        }
        _returnDust();
    }

    /**
     * @dev Cancel multiple exchange orders
     * @param orders Exchange orders to cancel
     */
    function cancelExchangeOrders(Order[] calldata orders) external {
        for (uint256 i = 0; i < orders.length; ++i) {
            cancelExchangeOrder(orders[i]);
        }
    }

    /**
     * @dev Get user nonce
     */
    function getNonce(address user) external view returns (uint256 nonce) {
        nonce = nonces[user];
    }
    /**
     * @dev increase user nonce
     */
    function incrementNonce() external {
        nonces[msg.sender] += 1;
        emit NonceIncremented(msg.sender, nonces[msg.sender]);
    }

    function setOracle(address _oracle)
        external
        onlyOwner
    {
        _setOracle(_oracle);
    }

    function setBlockRange(uint256 _blockRange)
        external
        onlyOwner
    {
        _setBlockRange(_blockRange);
    }

    function setMatchCriteriaRouter(IMatchCriteriaRouter _matchCriteriaRouter)
        external
        onlyOwner
    {
        _setMatchCriteriaRouter(_matchCriteriaRouter);
    }

    function openExchange() external onlyOwner {
        _openExchange();
    }
    
    function closeExchange() external onlyOwner {
        _closeExchange();
    }

    /**
     * @dev Cancel an buy or sell exchange order
     * @param order Exchange order to cancel
     */
    function cancelExchangeOrder(Order calldata order) public {
        /* Assert sender is authorized to cancel order. */
        // require(msg.sender == order.trader, "MarkExchange: only trader can cancel");
        if(msg.sender != order.trader) revert NotOrderTrader();

        bytes32 hash = _hashOrder(order, nonces[order.trader]);

        if(cancelledOrFilled[hash]) revert OrderCancelledOrFilled();

        /* Mark order as cancelled, preventing it from being matched. */
        cancelledOrFilled[hash] = true;

        emit OrderCancelled(hash);
    }
}