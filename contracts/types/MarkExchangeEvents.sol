// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../types/MarkExchangeDataTypes.sol";
import "../interfaces/IMatchCriteriaRouter.sol";

interface MarkExchangeEvents {
    event Opened();
    event Closed();

    event OrdersMatched(
        address indexed maker,
        address indexed taker,
        Order sell,
        bytes32 sellHash,
        Order buy,
        bytes32 buyHash
    );

    event OrderCancelled(bytes32 hash);
    event NonceIncremented(address indexed trader, uint256 newNonce);

    event NewMatchCriteriaRouter(IMatchCriteriaRouter indexed matchCriteriaRouter);
    event NewOracle(address indexed oracle);
    event NewBlockRange(uint256 blockRange);
    event NewFeeRate(uint256 feeRate);
    event NewFeeRecipient(address feeRecipient);
    event NewGovernor(address governor);

    //Matching Criteria
    event CriteriaRevoked(address indexed Criteria);
    event CriteriaGranted(address indexed Criteria);


}
