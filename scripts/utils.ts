import {
  getContract as _getContract,
  updateAddresses as _updateAddresses,
  getAddress as _getAddress,
} from './web3-utils';

const repo = 'MarkExchange';

const contracts = {
  MarkExchangeRouter: 'MarkExchangeRouter',
  // ExecutionDelegate: 'EXECUTION_DELEGATE',
  MatchCriteriaRouter: 'MatchCriteriaRouter',
  MatchCriteriaERC721: 'MatchCriteriaERC721',
  MatchCriteriaERC1155: 'MatchCriteriaERC1155',
  BulkSignVerifier: 'BulkSignVerifier',
};

export function getAddress(contract: string, network: string): string {
  return _getAddress(repo, contract, contracts, network);
}

export function getContract(hre: any, contract: string, options?: any) {
  return _getContract(hre, repo, contract, contracts, options);
}

export function updateAddresses(
  network: string,
  addresses = Object.keys(contracts),
) {
  _updateAddresses(repo, addresses, contracts, network);
}
