// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {IMatchCriteriaRouter} from "../interfaces/IMatchCriteriaRouter.sol";
import "../types/MarkExchangeEvents.sol";

/**
 * @title MatchCriteriaRouter
 * @dev Manages the Criteria for the futureverse nft exchange
 */
contract MatchCriteriaRouter is IMatchCriteriaRouter, Ownable, MarkExchangeEvents{
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _grantedCriteria;

    /**
     * @notice Grant matching Criteria
     * @param Criteria address of Criteria to grant
     */
    function grantCriteria(address Criteria) external override onlyOwner {
        require(Criteria != address(0), "MatchCriteriaRouter: Address cannot be zero");

        if (!_grantedCriteria.contains(Criteria)) {
            _grantedCriteria.add(Criteria);
            emit CriteriaGranted(Criteria);
        }
    }

    /**
     * @notice Revoke matching Criteria
     * @param Criteria address of Criteria to revoke
     */
    function revokeCriteria(address Criteria) external override onlyOwner {
        if (_grantedCriteria.contains(Criteria)) {
            _grantedCriteria.remove(Criteria);
            emit CriteriaRevoked(Criteria);
        }
    }

    /**
     * @notice Returns if a Criteria has been granted
     * @param Criteria address of the Criteria to check
     */
    function isCriteriaGranted(address Criteria) external view override returns (bool) {
        return _grantedCriteria.contains(Criteria);
    }

    /**
     * @notice View number of granted Criteria
     */
    function viewCountGrantedCriteria() external view override returns (uint256) {
        return _grantedCriteria.length();
    }

    /**
     * @notice See granted Criteria
     * @param cursor cursor
     * @param size size
     */
    function viewGrantedCriteria(uint256 cursor, uint256 size)
        external
        view
        override
        returns (address[] memory, uint256)
    {
        uint256 length = _grantedCriteria.length();
        uint256 remaining = length > cursor ? length - cursor : 0;
        uint256 resultSize = remaining < size ? remaining : size;

        address[] memory grantedCriteria = new address[](resultSize);

        for (uint256 i = 0; i < resultSize; ++i) {
            grantedCriteria[i] = _grantedCriteria.at(cursor + i);
        }

        return (grantedCriteria, cursor + resultSize);
    }
}
