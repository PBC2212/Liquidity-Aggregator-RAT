// scripts/deploy-oracle.js
const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Price Oracle...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy Price Oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.deployed();
    
    console.log("Price Oracle deployed to:", priceOracle.address);
    
    // Add price feeds for common assets
    // These are Ethereum mainnet addresses - update for your network
    const priceFeeds = {
        ETH: {
            address: "0x0000000000000000000000000000000000000000", // Use address(0) for ETH
            feed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD on Ethereum
            name: "Ethereum"
        },
        BTC: {
            address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC on Ethereum
            feed: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", // BTC/USD
            name: "Bitcoin"
        },
        USDC: {
            address: "0xA0b86a33E6Fe17E5473c9B7c5EE37E41fE0C7C68", // USDC on Ethereum
            feed: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", // USDC/USD
            name: "USD Coin"
        }
    };
    
    console.log("\nAdding price feeds...");
    
    for (const [symbol, config] of Object.entries(priceFeeds)) {
        try {
            const tx = await priceOracle.addPriceFeed(
                config.address,
                config.feed,
                config.name
            );
            await tx.wait();
            console.log(`✓ Added ${symbol} price feed`);
        } catch (error) {
            console.log(`❌ Failed to add ${symbol} price feed:`, error.message);
        }
    }
    
    // Save deployment info
    const deploymentInfo = {
        PriceOracle: priceOracle.address,
        deployer: deployer.address,
        network: await ethers.provider.getNetwork(),
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        './oracle-deployment.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n=".repeat(50));
    console.log("PRICE ORACLE DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));
    console.log("Price Oracle Address:", priceOracle.address);
    console.log("Deployment info saved to oracle-deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });