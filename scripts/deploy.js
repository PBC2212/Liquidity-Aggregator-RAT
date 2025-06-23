// deploy.js
const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Token addresses (update these for your network)
    const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum mainnet
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Ethereum mainnet
    
    // Update these addresses based on your target network:
    // For Polygon: USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    // For BSC: USDT = "0x55d398326f99059fF775485246999027B3197955"
    
    // 1. Deploy RAT Token
    console.log("\n1. Deploying RAT Token...");
    const RATToken = await ethers.getContractFactory("RATToken");
    const ratToken = await RATToken.deploy();
    await ratToken.deployed();
    console.log("RAT Token deployed to:", ratToken.address);
    
    // 2. Deploy Liquidity Aggregator
    console.log("\n2. Deploying Liquidity Aggregator...");
    const LiquidityAggregator = await ethers.getContractFactory("LiquidityAggregator");
    const liquidityAggregator = await LiquidityAggregator.deploy(
        USDT_ADDRESS,
        WETH_ADDRESS,
        deployer.address // Fee recipient
    );
    await liquidityAggregator.deployed();
    console.log("Liquidity Aggregator deployed to:", liquidityAggregator.address);
    
    // 3. Deploy Pledge Manager
    console.log("\n3. Deploying Pledge Manager...");
    const PledgeManager = await ethers.getContractFactory("PledgeManager");
    const pledgeManager = await PledgeManager.deploy(ratToken.address);
    await pledgeManager.deployed();
    console.log("Pledge Manager deployed to:", pledgeManager.address);
    
    // 4. Set up connections
    console.log("\n4. Setting up contract connections...");
    
    // Add PledgeManager as minter for RAT Token
    await ratToken.addMinter(pledgeManager.address);
    console.log("✓ Added PledgeManager as RAT Token minter");
    
    // Set Liquidity Aggregator in PledgeManager
    await pledgeManager.setLiquidityAggregator(liquidityAggregator.address);
    console.log("✓ Set Liquidity Aggregator in PledgeManager");
    
    // Add PledgeManager as authorized caller in Liquidity Aggregator
    await liquidityAggregator.addAuthorizedCaller(pledgeManager.address);
    console.log("✓ Added PledgeManager as authorized caller in Liquidity Aggregator");
    
    // 5. Add initial ETH liquidity to aggregator (optional)
    console.log("\n5. Adding initial ETH liquidity...");
    await liquidityAggregator.addETHLiquidity({ value: ethers.utils.parseEther("1.0") });
    console.log("✓ Added 1 ETH to Liquidity Aggregator");
    
    // 6. Deploy verification results
    console.log("\n" + "=".repeat(50));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));
    console.log("RAT Token:", ratToken.address);
    console.log("Pledge Manager:", pledgeManager.address);
    console.log("Liquidity Aggregator:", liquidityAggregator.address);
    console.log("Deployer (Admin):", deployer.address);
    console.log("=".repeat(50));
    
    // 7. Save deployment info
    const deploymentInfo = {
        network: await ethers.provider.getNetwork(),
        contracts: {
            RATToken: ratToken.address,
            PledgeManager: pledgeManager.address,
            LiquidityAggregator: liquidityAggregator.address
        },
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        './deployment-info.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployment-info.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });