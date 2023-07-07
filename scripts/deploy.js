// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers }= require("hardhat");

// npx hardhat run --network sepolia scripts/deploy.js
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`deployer: ${deployer.address}`);

  const MockERC721 = await ethers.getContractFactory('MockERC721')
  const mockERC721 = await MockERC721.deploy()
  await mockERC721.deployed()

  console.log('mockERC721 contract deployed to:', mockERC721.address)

  const MatchCriteriaRouter = await ethers.getContractFactory('MatchCriteriaRouter')
  const matchCriteriaRouter = await MatchCriteriaRouter.deploy()
  await matchCriteriaRouter.deployed()

  console.log('MatchCriteriaRouter contract deployed to:', matchCriteriaRouter.address)

  const MatchCriteriaERC721 = await ethers.getContractFactory('MatchCriteriaERC721')
  const matchCriteriaERC721 = await MatchCriteriaERC721.deploy()
  await matchCriteriaERC721.deployed()

  console.log('MatchCriteriaERC721 contract deployed to:', matchCriteriaERC721.address)

  const MatchCriteriaERC1155 = await ethers.getContractFactory('MatchCriteriaERC1155')
  const matchCriteriaERC1155 = await MatchCriteriaERC1155.deploy()
  await matchCriteriaERC1155.deployed()

  console.log('MatchCriteriaERC1155 contract deployed to:', matchCriteriaERC1155.address)

  await matchCriteriaRouter.grantCriteria(matchCriteriaERC1155.address)


  const MarkExchangeRouter = await ethers.getContractFactory('MarkExchangeRouter')
  //_oracle 0x679BFddE2a44E3ce2c6bA8F4641c9749ED22efD9
  //_blockRange 100000
  //_maxPlatformFeeRate 250 2.5%
  const markExchangeRouter = await MarkExchangeRouter.deploy(matchCriteriaRouter.address, '0x679BFddE2a44E3ce2c6bA8F4641c9749ED22efD9', 100000, 250)
  await markExchangeRouter.deployed()

  console.log('MarkExchangeRouter contract deployed to:', markExchangeRouter.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
