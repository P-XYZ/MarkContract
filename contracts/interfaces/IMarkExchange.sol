// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {SettlementInput, Order} from "../types/MarkExchangeDataTypes.sol";
import "./IMatchCriteriaRouter.sol";

interface IMarkExchange {

    // event Opened();
    // event Closed();

    //     /* Events */
    // event OrdersMatched(
    //     address indexed maker,
    //     address indexed taker,
    //     Order sell,
    //     bytes32 sellHash,
    //     Order buy,
    //     bytes32 buyHash
    // );

    // event OrderCancelled(bytes32 hash);
    // event NonceIncremented(address indexed trader, uint256 newNonce);

    // event NewMatchCriteriaRouter(IMatchCriteriaRouter indexed matchCriteriaRouter);
    // event NewOracle(address indexed oracle);
    // event NewBlockRange(uint256 blockRange);
    // event NewFeeRate(uint256 feeRate);
    // event NewFeeRecipient(address feeRecipient);
    // event NewGovernor(address governor);
    
    function getNonce(address) external view returns (uint256);

    function openExchange() external;
    function closeExchange() external;

    // function initialize(
    //     IMatchCriteriaRouter _matchCriteriaRouter,
    //     address _oracle,
    //     uint _blockRange,
    //     uint256 _maxFeeRate
    // ) external;

    function setMatchCriteriaRouter(IMatchCriteriaRouter _matchCriteriaRouter) external;

    function setOracle(address _oracle) external;

    function setBlockRange(uint256 _blockRange) external;

    function cancelExchangeOrder(Order calldata order) external;

    function cancelExchangeOrders(Order[] calldata orders) external;

    function incrementNonce() external;

    function settleExchangeInputs(SettlementInput calldata sell, SettlementInput calldata buy)
        external
        payable;
}
