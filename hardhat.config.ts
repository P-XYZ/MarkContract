require("@nomicfoundation/hardhat-toolbox");
const dotenv = require('dotenv');
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [{
      version: "0.8.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      }
    }, {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      }
    }],

  },

  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_URL || "",
        blockNumber: 13677212,
      },
      chainId: 1,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },

};
