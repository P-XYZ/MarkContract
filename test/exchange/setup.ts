import { simpleDeploy } from '@makerdao/hardhat-utils';
import { expect } from 'chai';
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import hre from 'hardhat';

import { eth, Order, Side } from './utils';

export async function deploy(
  hre: any,
  name: string,
  calldata: any = [],
  options: any = {},
) {
  const contractFactory = await hre.ethers.getContractFactory(name, options);
  const contract = await contractFactory.deploy(...calldata);

  await contract.deployed();
  return contract;
}

export interface SetupExchangeOpts {
  admin: any;
  weth: Contract;
}
export interface SetupExchangeResult {
  exchange: Contract;
  matchCriterias: Record<string, Contract>;
}
export type SetupExchangeFunction = (
  opts: SetupExchangeOpts,
) => Promise<SetupExchangeResult>;

interface SetupTestOpts {
  price: BigNumber;
  feeRate: number;
  setupExchange: SetupExchangeFunction;
}

export type CheckBalances = (...args: any[]) => Promise<void>;
export type GenerateOrder = (account: Wallet, overrides?: any) => Order;

interface SetupTestResult {
  admin: any;
  alice: any;
  bob: any;
  thirdParty: any;
  exchange: Contract;
  matchCriterias: Record<string, Contract>;
  mockERC721: Contract;
  mockERC1155: Contract;
  tokenId: number;
  weth: any;
  checkBalances: CheckBalances;
  generateOrder: GenerateOrder;
}
export type SetupTestFunction = (
  opts: SetupTestOpts,
) => Promise<SetupTestResult>;

async function setupRegistry(
  alice: any,
  bob: any,
  mockERC721: Contract,
  mockERC1155: Contract,
  weth: Contract,
  exchange: Contract,
) {
  await mockERC721
    .connect(alice)
    .setApprovalForAll(exchange.address, true);
  await mockERC721
    .connect(bob)
    .setApprovalForAll(exchange.address, true);
  await mockERC1155
    .connect(alice)
    .setApprovalForAll(exchange.address, true);
  await mockERC1155
    .connect(bob)
    .setApprovalForAll(exchange.address, true);
  await weth
    .connect(bob)
    .approve(exchange.address, eth('10000000000000'));
  await weth
    .connect(alice)
    .approve(exchange.address, eth('1000000000000'));
}

async function setupMocks(alice: any, bob: any) {
  const mockERC721 = (await simpleDeploy('MockERC721', [])) as any;
  const mockERC1155 = (await simpleDeploy('MockERC1155', [])) as any;
  // TODO
  const weth = (await simpleDeploy('MockERC20', [])) as any;
  const totalSupply = await mockERC721.totalSupply();
  const tokenId = totalSupply.toNumber() + 1;
  console.log(`weth: ${weth.address}`);

  await mockERC721.mint(alice.address, tokenId);

  await weth.mint(bob.address, eth('1000'));
  await weth.mint(alice.address, eth('1000'));

  return { weth, mockERC721, mockERC1155, tokenId };
}

export async function setupTest({
  price,
  feeRate,
  setupExchange,
}: SetupTestOpts): Promise<SetupTestResult> {
  const [admin, alice, bob, thirdParty] = await hre.ethers.getSigners();
  const currentTimestamp = (await admin.provider.getBlock('latest')).timestamp;
  console.log(`currentTimestamp: ${currentTimestamp}`);

  const { weth, mockERC721, mockERC1155, tokenId } = await setupMocks(
    alice,
    bob,
  );
  const { exchange, matchCriterias } = await setupExchange(
    {
      admin,
      weth,
    },
  );
  await setupRegistry(
    alice,
    bob,
    mockERC721,
    mockERC1155,
    weth,
    exchange,
  );

  const checkBalances = async (
    aliceEth: any,
    aliceWeth: any,
    bobEth: any,
    bobWeth: any,
    feeRecipientEth: any,
    feeRecipientWeth: any,
  ) => {
    expect(await alice.getBalance()).to.be.equal(aliceEth);
    expect(await weth.balanceOf(alice.address)).to.be.equal(aliceWeth);
    expect(await bob.getBalance()).to.be.equal(bobEth);
    expect(await weth.balanceOf(bob.address)).to.be.equal(bobWeth);
    expect(
      await (admin.provider as ethers.providers.Provider).getBalance(
        thirdParty.address,
      ),
    ).to.be.equal(feeRecipientEth);
    expect(await weth.balanceOf(thirdParty.address)).to.be.equal(
      feeRecipientWeth,
    );
  };

  const generateOrder = (account: Wallet, overrides: any = {}): Order => {
    return new Order(
      account,
      {
        trader: account.address,
        side: Side.Buy,
        matchingCriteria: matchCriterias.matchCriteriaERC721.address,
        collection: mockERC721.address,
        tokenId,
        amount: 1,
        paymentToken: weth.address,
        price,
        listingTime: (currentTimestamp - 1000).toString(),
        expirationTime: (currentTimestamp + 1000 * 60 * 10).toString(),
        fees: [
          {
            rate: feeRate,
            recipient: thirdParty.address,
          },
        ],
        salt: 0,
        extraParams: '0x',
        ...overrides,
      },
      admin,
      exchange,
    );
  };
  console.log(`admin: ${admin.address}`);
  console.log(`alice: ${alice.address}`);
  console.log(`bob: ${bob.address}`);
  return {
    admin,
    alice,
    bob,
    thirdParty,
    exchange,
    matchCriterias,
    mockERC721,
    mockERC1155,
    tokenId,
    weth,
    checkBalances,
    generateOrder,
  };
}
