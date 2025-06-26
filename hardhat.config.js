require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH per account
      },
    },
    
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },

    goerli: {
      url: process.env.GOERLI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 5,
    },

    mainnet: {
      url: process.env.ETHEREUM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
  },
  
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};