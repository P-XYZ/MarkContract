const { ethers }= require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`deployer: ${deployer.address}`);
  
  const MatchCriteriaRouter = await ethers.getContractFactory('MatchCriteriaRouter');
  const matchCriteriaRouter = await MatchCriteriaRouter.deploy();
  await matchCriteriaRouter.deployed();
  console.log('MatchCriteriaRouter contract deployed to:', matchCriteriaRouter.address)
  
  const MatchCriteriaERC721 = await ethers.getContractFactory('MatchCriteriaERC721');
  const matchCriteriaERC721 = await MatchCriteriaERC721.deploy();
  await matchCriteriaERC721.deployed();
  console.log('MatchCriteriaERC721 contract deployed to:', matchCriteriaERC721.address);
  
  const MatchCriteriaERC1155 = await ethers.getContractFactory('MatchCriteriaERC1155');
  const matchCriteriaERC1155 = await MatchCriteriaERC1155.deploy();
  await matchCriteriaERC1155.deployed();
  console.log('MatchCriteriaERC1155 contract deployed to:', matchCriteriaERC1155.address)
  
  await matchCriteriaRouter.grantCriteria(matchCriteriaERC1155.address)
  
  const MarkExchangeRouter = await ethers.getContractFactory('MarkExchangeRouter');
  const markExchangeRouter = await MarkExchangeRouter.deploy(matchCriteriaRouter.address, 'oracle-address', 100000, 250);
  await markExchangeRouter.deployed();
  console.log('MarkExchangeRouter contract deployed to:', markExchangeRouter.address);

  // call openExchange() here
  await markExchangeRouter.openExchange();
  
  
  // verify deployed contracts on etherscan
  await hre.run("verify:verify", {
    address: markExchangeRouter.address,
    constructorArguments: [matchCriteriaRouter.address, 'oracle-address', 100000, 250],
  })

  await hre.run("verify:verify", {
    address: matchCriteriaERC1155.address,
    constructorArguments: [],
  })

  await hre.run("verify:verify", {
    address: matchCriteriaERC721.address,
    constructorArguments: [],
  })

  await hre.run("verify:verify", {
    address: matchCriteriaRouter.address,
    constructorArguments: [],
  })
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


/* 
Note:

- Update the 'oracle-address' to the correct address of oracle contract in your cases.
- The above script assumes that your contracts have no constructor parameters. If they have, you need to adjust constructorArguments accordingly.
- This only works if you have hooked hardhat-etherscan plugin in your hardhat config and filled the etherscan api keys. Otherwise, you need to verify the contracts on etherscan manually by providing the contract address, the contract initial parameters(if any) and the solidity code. */