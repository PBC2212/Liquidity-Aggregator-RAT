// deploy-with-staking.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting RAT Asset Pledge System with Staking Pool deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    
    // Token addresses (update these for your network)
    const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum mainnet
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Ethereum mainnet
    
    // Update these addresses based on your target network:
    // For Polygon: USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    // For BSC: USDT = "0x55d398326f99059fF775485246999027B3197955"
    
    console.log("\n📋 Network Configuration:");
    console.log("USDT Address:", USDT_ADDRESS);
    console.log("WETH Address:", WETH_ADDRESS);
    console.log("Fee Recipient:", deployer.address);
    
    // 1. Deploy RAT Token
    console.log("\n1️⃣ Deploying RAT Token...");
    const RATToken = await ethers.getContractFactory("RATToken");
    const ratToken = await RATToken.deploy();
    await ratToken.deployed();
    console.log("✅ RAT Token deployed to:", ratToken.address);
    
    // 2. Deploy RAT Staking Pool
    console.log("\n2️⃣ Deploying RAT Staking Pool...");
    const RATStakingPool = await ethers.getContractFactory("RATStakingPool");
    const ratStakingPool = await RATStakingPool.deploy(
        ratToken.address,
        USDT_ADDRESS,
        deployer.address // Fee recipient
    );
    await ratStakingPool.deployed();
    console.log("✅ RAT Staking Pool deployed to:", ratStakingPool.address);
    
    // 3. Deploy Liquidity Aggregator
    console.log("\n3️⃣ Deploying Liquidity Aggregator...");
    const LiquidityAggregator = await ethers.getContractFactory("LiquidityAggregator");
    const liquidityAggregator = await LiquidityAggregator.deploy(
        USDT_ADDRESS,
        WETH_ADDRESS,
        deployer.address // Fee recipient
    );
    await liquidityAggregator.deployed();
    console.log("✅ Liquidity Aggregator deployed to:", liquidityAggregator.address);
    
    // 4. Deploy Pledge Manager
    console.log("\n4️⃣ Deploying Pledge Manager...");
    const PledgeManager = await ethers.getContractFactory("PledgeManager");
    const pledgeManager = await PledgeManager.deploy(ratToken.address);
    await pledgeManager.deployed();
    console.log("✅ Pledge Manager deployed to:", pledgeManager.address);
    
    console.log("\n🔗 Setting up contract integrations...");
    
    // 5. Set up RAT Token permissions
    console.log("\n5️⃣ Configuring RAT Token permissions...");
    await ratToken.addMinter(pledgeManager.address);
    console.log("✅ Added PledgeManager as RAT Token minter");
    
    // 6. Connect Pledge Manager with other contracts
    console.log("\n6️⃣ Connecting Pledge Manager...");
    await pledgeManager.setLiquidityAggregator(liquidityAggregator.address);
    console.log("✅ Set Liquidity Aggregator in PledgeManager");
    
    await pledgeManager.setRATStakingPool(ratStakingPool.address);
    console.log("✅ Set RAT Staking Pool in PledgeManager");
    
    // 7. Connect Liquidity Aggregator with other contracts
    console.log("\n7️⃣ Connecting Liquidity Aggregator...");
    await liquidityAggregator.addAuthorizedCaller(pledgeManager.address);
    console.log("✅ Added PledgeManager as authorized caller in Liquidity Aggregator");
    
    await liquidityAggregator.setRATStakingPool(ratStakingPool.address);
    console.log("✅ Set RAT Staking Pool in Liquidity Aggregator");
    
    // 8. Connect Staking Pool with other contracts
    console.log("\n8️⃣ Connecting RAT Staking Pool...");
    await ratStakingPool.setPledgeManager(pledgeManager.address);
    console.log("✅ Set PledgeManager in RAT Staking Pool");
    
    await ratStakingPool.addYieldProvider(liquidityAggregator.address);
    console.log("✅ Added Liquidity Aggregator as yield provider");
    
    // 9. Configure system parameters
    console.log("\n9️⃣ Configuring system parameters...");
    
    // Configure auto-staking (80% of RAT tokens auto-staked)
    await pledgeManager.setAutoStakeConfig(true, 8000); // 80%
    console.log("✅ Enabled auto-staking (80% of RAT tokens)");
    
    // Configure yield distribution (50% of USDT goes to yield)
    await liquidityAggregator.setAutoYieldConfig(true, 5000); // 50%
    console.log("✅ Enabled auto-yield (50% of USDT to staking pool)");
    
    // Set staking pool parameters
    await ratStakingPool.setYieldDistributionRate(1000); // 10% daily distribution
    console.log("✅ Set yield distribution rate to 10% daily");
    
    // 10. Add initial liquidity
    console.log("\n🔟 Adding initial liquidity...");
    const initialETH = "2.0"; // 2 ETH
    await liquidityAggregator.addETHLiquidity({ 
        value: ethers.utils.parseEther(initialETH) 
    });
    console.log(`✅ Added ${initialETH} ETH to Liquidity Aggregator`);
    
    // 11. Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check RAT token configuration
    const ratSupply = await ratToken.totalSupply();
    const ratMaxSupply = await ratToken.MAX_SUPPLY();
    console.log(`RAT Token Supply: ${ethers.utils.formatEther(ratSupply)} / ${ethers.utils.formatEther(ratMaxSupply)}`);
    
    // Check staking pool configuration
    const stakingPoolStats = await ratStakingPool.getPoolStats();
    console.log(`Staking Pool - Total Staked: ${ethers.utils.formatEther(stakingPoolStats._totalStaked)} RAT`);
    
    // Check aggregator configuration
    const aggregatorStats = await liquidityAggregator.getAggregatorStats();
    console.log(`Aggregator - USDT Balance: ${ethers.utils.formatUnits(aggregatorStats._currentUSDTBalance, 6)} USDT`);
    console.log(`Aggregator - Auto Yield: ${aggregatorStats._autoYieldEnabled ? 'Enabled' : 'Disabled'} (${aggregatorStats._yieldPercentage / 100}%)`);
    
    // 12. Display deployment summary
    console.log("\n" + "=".repeat(80));
    console.log("🎉 DEPLOYMENT COMPLETE - RAT ASSET PLEDGE SYSTEM WITH STAKING");
    console.log("=".repeat(80));
    console.log("📋 Contract Addresses:");
    console.log("  RAT Token:           ", ratToken.address);
    console.log("  RAT Staking Pool:    ", ratStakingPool.address);
    console.log("  Pledge Manager:      ", pledgeManager.address);
    console.log("  Liquidity Aggregator:", liquidityAggregator.address);
    console.log("\n👤 Admin Address:      ", deployer.address);
    console.log("💰 Initial ETH Added:  ", initialETH, "ETH");
    console.log("\n⚙️ System Configuration:");
    console.log("  Auto-Staking:        Enabled (80% of RAT tokens)");
    console.log("  Auto-Yield:          Enabled (50% of USDT to staking)");
    console.log("  Yield Distribution:  10% daily");
    console.log("  Unstake Lock Period: 7 days");
    console.log("=".repeat(80));
    
    // 13. Save deployment info
    const deploymentInfo = {
        network: await ethers.provider.getNetwork(),
        contracts: {
            RATToken: ratToken.address,
            RATStakingPool: ratStakingPool.address,
            PledgeManager: pledgeManager.address,
            LiquidityAggregator: liquidityAggregator.address
        },
        configuration: {
            USDT_ADDRESS,
            WETH_ADDRESS,
            autoStakingEnabled: true,
            autoStakingPercentage: 8000,
            autoYieldEnabled: true,
            autoYieldPercentage: 5000,
            yieldDistributionRate: 1000,
            initialETHAdded: initialETH
        },
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        gasUsed: {
            // Could track gas usage here
        }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        './deployment-info-staking.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("📄 Deployment info saved to deployment-info-staking.json");
    
    // 14. Next steps guidance
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Test the system with a sample asset pledge:");
    console.log("   npx hardhat run scripts/test-staking-system.js");
    console.log("\n2. Use admin operations to manage the system:");
    console.log("   node scripts/admin-staking-operations.js pending");
    console.log("   node scripts/admin-staking-operations.js stakingstats");
    console.log("\n3. Users can pledge assets and earn yields:");
    console.log("   node scripts/user-interface.js");
    console.log("\n4. Monitor yield distribution:");
    console.log("   node scripts/admin-staking-operations.js distribute");
    console.log("\n🎯 Your RAT Asset Pledge System with automatic staking and yield distribution is now live!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });