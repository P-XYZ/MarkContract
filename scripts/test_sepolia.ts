// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers }= require("hardhat");
import { BigNumber, Wallet } from 'ethers';
import { eth, Order, Side } from '../test/exchange';

const deployedAddress = {
  "MatchCriteriaRouter": "0xcD8B2944CD50e32e04376EbA27fD4835D7734B98",
  "MatchCriteriaERC721": "0x5dF160605E04087dCF41e4286e889321CC6Bd83F",
  "MatchCriteriaERC1155": "0x057832E0252492692D9F164436c31315e911d17F",
  "MarkExchangeRouter": "0xbBf75DDf6194212811Db06c031b1ea77E53cF0C9",
  "MockERC721": "0xf53c2D9311117892BfF503635d1AE47d9eF8862A",
};
let exchangeRouter;
let deployer;
let currentTimestamp;
const INVERSE_BASIS_POINT = 10000;
// const price: BigNumber = eth('1');
const price: BigNumber = eth('0.0000001');
const feeRate = 300;
const wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
let tokenId = 8;

// npx hardhat run --network sepolia scripts/test_sepolia.ts
async function main() {
  [deployer] = await hre.ethers.getSigners();
  console.log(`deployer: ${deployer.address}`);
  currentTimestamp = (await deployer.provider.getBlock('latest')).timestamp;

  const MarkExchangeRouter = await ethers.getContractFactory('MarkExchangeRouter')
  exchangeRouter = MarkExchangeRouter.attach(deployedAddress.MarkExchangeRouter);
  console.log(`exchangeStatusOpen: ${await exchangeRouter.exchangeStatusOpen()}`);
  if (false)
  {
    await exchangeRouter.openExchange();
    console.log(`exchangeStatusOpen: ${await exchangeRouter.exchangeStatusOpen()}`);
  }

  const MatchCriteriaRouter = await ethers.getContractFactory('MatchCriteriaRouter')
  const matchCriteriaRouter = MatchCriteriaRouter.attach(deployedAddress.MatchCriteriaRouter);
  console.log(`CriteriaERC721 granted: ${await matchCriteriaRouter.isCriteriaGranted(deployedAddress.MatchCriteriaERC721)}`);
  console.log(`CriteriaERC1155 granted: ${await matchCriteriaRouter.isCriteriaGranted(deployedAddress.MatchCriteriaERC1155)}`);
  if (false)
  {
    await matchCriteriaRouter.grantCriteria(deployedAddress.MatchCriteriaERC721)
    console.log(`CriteriaERC721 granted: ${await matchCriteriaRouter.isCriteriaGranted(deployedAddress.MatchCriteriaERC721)}`);
    console.log(`CriteriaERC1155 granted: ${await matchCriteriaRouter.isCriteriaGranted(deployedAddress.MatchCriteriaERC1155)}`);
  }

  const MockERC721 = await ethers.getContractFactory('MockERC721')
  const mockERC721 = MockERC721.attach(deployedAddress.MockERC721);
  if (false)
  {
    await mockERC721.mint(deployer.address, tokenId);
    await mockERC721.setApprovalForAll(exchangeRouter.address, true);
  }

  if (false) {
    const sellOrder = generateOrder(deployer, { side: Side.Sell });
    const sellOrderHash = await sellOrder.hash();
    const buyOrder = generateOrder(deployer, { side: Side.Buy });
    const buyOrderHash = await buyOrder.hash();
    // console.log(`sellOrder: ${JSON.stringify(sellOrder, null, 2)}`);
    // console.log(`buyOrder: ${JSON.stringify(buyOrder, null, 2)}`);
    const sellInput = await sellOrder.pack();
    const buyInput = await buyOrder.pack();
    // console.log(`sellInput: ${JSON.stringify(sellInput, null, 2)}`);
    // console.log(`buyInput: ${JSON.stringify(buyInput, null, 2)}`);
    // https://sepolia.etherscan.io/tx/0x7509d4f91a93e59c230507e9d6ae1c1a0c97258b2e6c6844a4aedd23300ca476
    await exchangeRouter.settleExchangeInputs(sellInput, buyInput);
  }

  if (true) {
    tokenId = 6;
    const sellOrder = generateOrder(deployer, { side: Side.Sell });
    const buyOrder = generateOrder(deployer, { side: Side.Buy });
    const sellInput = await sellOrder.pack();
    const buyInput = await buyOrder.pack();

    tokenId = 7;
    const sellOrder2 = generateOrder(deployer, { side: Side.Sell });
    const buyOrder2 = generateOrder(deployer, { side: Side.Buy });
    const sellInput2 = await sellOrder2.pack();
    const buyInput2 = await buyOrder2.pack();

    await exchangeRouter.bulksettleExchangeInputs(
      [
        [
          sellInput, buyInput
        ],
        [
          sellInput2, buyInput2
        ],
      ]
    );
  }
}

const generateOrder = (account: Wallet, overrides: any = {}): Order => {
  return new Order(
    account,
    {
      trader: account.address,
      side: Side.Buy,
      matchingCriteria: deployedAddress.MatchCriteriaERC721,
      collection: deployedAddress.MockERC721,
      tokenId,
      amount: 1,
      paymentToken: wethAddress,
      price,
      listingTime: (currentTimestamp - 1000).toString(),
      expirationTime: (currentTimestamp + 1000 * 60 * 10).toString(),
      fees: [
      ],
      salt: 0,
      extraParams: '0x',
      ...overrides,
    },
    deployer,
    exchangeRouter,
  );
};
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
