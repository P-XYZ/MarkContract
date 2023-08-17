// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

interface IMatchCriteriaRouter {

    function grantCriteria(address Criteria) external;

    function revokeCriteria(address Criteria) external;

    function isCriteriaGranted(address Criteria) external view returns (bool);

    function viewGrantedCriteria(uint256 cursor, uint256 size) external view returns (address[] memory, uint256);

    function viewCountGrantedCriteria() external view returns (uint256);
}
