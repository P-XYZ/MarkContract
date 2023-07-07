import { task } from 'hardhat/config';

import { Contract } from 'ethers';
import { getAddress, getContract, updateAddresses } from './utils';
import { deploy, getAddressEnv, getNetwork, waitForTx } from './web3-utils';

export async function deployFull(
  hre: any,
  chainId: string | number,
  WETH_ADDRESS: string,
  oracleAddress: string,
): Promise<{
  exchange: Contract;
  matchCriterias: Record<string, Contract>;
}> {
  const matchCriteriaRouter = await deploy(hre, 'MatchCriteriaRouter');

  const matchCriteriaERC721 = await deploy(hre, 'MatchCriteriaERC721');
  const matchCriteriaERC1155 = await deploy(hre, 'MatchCriteriaERC1155');
  await waitForTx(matchCriteriaRouter.grantCriteria(matchCriteriaERC721.address));
  await waitForTx(matchCriteriaRouter.grantCriteria(matchCriteriaERC1155.address));
  const matchCriterias = { matchCriteriaERC721, matchCriteriaERC1155 };

  const bulkSignVerifier = await deploy(hre, 'BulkSignVerifier', []);
  const exchange = await deploy(
    hre,
    "TestMarkExchangeRouter",
    [
      matchCriteriaRouter.address,
      '0x679BFddE2a44E3ce2c6bA8F4641c9749ED22efD9',
      100000,
      250
    ],
    // { libraries: { BulkSignVerifier: bulkSignVerifier.address } },
    'MarkExchangeRouter',
  );
  await exchange.openExchange();
  return { exchange, matchCriterias };
}
/*
task('set-block-range', 'Set Block Range')
  .addParam('b', 'New block range')
  .setAction(async ({ b }, hre) => {
    const { network } = getNetwork(hre);

    const merkleVerifierAddress = await getAddress('MerkleVerifier', network);
    const exchange = await getContract(hre, 'MarkExchangeRouter', {
      libraries: { MerkleVerifier: merkleVerifierAddress },
    });
    await exchange.setBlockRange(b);
  });

task('set-fee-mechanism', 'Set Fee Mechanism').setAction(async (_, hre) => {
  const { network, NETWORK } = getNetwork(hre);

  const WETH_ADDRESS = getAddressEnv('WETH', NETWORK);

  const merkleVerifierAddress = await getAddress('MerkleVerifier', network);
  const exchange = await getContract(hre, 'MarkExchangeRouter', {
    libraries: { MerkleVerifier: merkleVerifierAddress },
  });

  const feeMechanism = await deploy(hre, 'FeeMechanism', [WETH_ADDRESS]);
  await exchange.setFeeMechanism(feeMechanism.address);

  updateAddresses(network, ['FeeMechanism']);
});

task('set-oracle', 'Set Oracle')
  .addParam('o', 'New Oracle')
  .setAction(async ({ o }, hre) => {
    const { network } = getNetwork(hre);

    const merkleVerifierAddress = await getAddress('MerkleVerifier', network);
    const exchange = await getContract(hre, 'MarkExchangeRouter', {
      libraries: { MerkleVerifier: merkleVerifierAddress },
    });

    await exchange.setOracle(o);
  });

task('close', 'Close').setAction(async (_, hre) => {
  const { network } = getNetwork(hre);

  const merkleVerifierAddress = await getAddress('MerkleVerifier', network);
  const exchange = await getContract(hre, 'MarkExchangeRouter', {
    libraries: { MerkleVerifier: merkleVerifierAddress },
  });

  await exchange.closeExchange();
});

task('transfer-admin', 'Transfer Admin to DAO Governance')
  .addParam('contractName', 'Name of contract to change admin')
  .setAction(async ({ contractName }, hre) => {
    const { network, NETWORK } = getNetwork(hre);

    const [signer] = await hre.ethers.getSigners();

    console.log(`Calling on ${network}`);
    console.log(`Calling from: ${await signer.getAddress()}`);

    const DAO_ADMIN_ADDRESS = getAddressEnv('DAO_ADMIN', NETWORK);

    const contract = await getContract(hre, contractName);

    await waitForTx(contract.transferOwnership(DAO_ADMIN_ADDRESS));
  });
*/