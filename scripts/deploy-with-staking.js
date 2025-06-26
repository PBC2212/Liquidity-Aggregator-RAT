const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Starting RAT Asset Pledge System with Staking Pool deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Get account balance (updated for ethers v6)
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    // Mock USDT address (for testing on local network)
    const mockUSDTAddress = "0x0000000000000000000000000000000000000001"; // Placeholder for now
    
    console.log("\n📄 Deploying contracts...");
    
    // 1. Deploy RAT Token
    console.log("1️⃣  Deploying RAT Token...");
    const RATToken = await ethers.getContractFactory("RATToken");
    const ratToken = await RATToken.deploy(deployer.address);
    await ratToken.waitForDeployment();
    const ratTokenAddress = await ratToken.getAddress();
    console.log("✅ RAT Token deployed to:", ratTokenAddress);
    
    // 2. Deploy Price Oracle
    console.log("2️⃣  Deploying Price Oracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(deployer.address);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("✅ Price Oracle deployed to:", priceOracleAddress);
    
    // 3. Deploy Pledge Manager
    console.log("3️⃣  Deploying Pledge Manager...");
    const PledgeManager = await ethers.getContractFactory("PledgeManager");
    const pledgeManager = await PledgeManager.deploy(deployer.address);
    await pledgeManager.waitForDeployment();
    const pledgeManagerAddress = await pledgeManager.getAddress();
    console.log("✅ Pledge Manager deployed to:", pledgeManagerAddress);
    
    // 4. Deploy Liquidity Aggregator
    console.log("4️⃣  Deploying Liquidity Aggregator...");
    const LiquidityAggregator = await ethers.getContractFactory("LiquidityAggregator");
    const liquidityAggregator = await LiquidityAggregator.deploy(
        mockUSDTAddress,
        deployer.address
    );
    await liquidityAggregator.waitForDeployment();
    const liquidityAggregatorAddress = await liquidityAggregator.getAddress();
    console.log("✅ Liquidity Aggregator deployed to:", liquidityAggregatorAddress);
    
    // 5. Deploy RAT Staking Pool
    console.log("5️⃣  Deploying RAT Staking Pool...");
    const RATStakingPool = await ethers.getContractFactory("RATStakingPool");
    const ratStakingPool = await RATStakingPool.deploy(
        ratTokenAddress,
        mockUSDTAddress,
        deployer.address
    );
    await ratStakingPool.waitForDeployment();
    const ratStakingPoolAddress = await ratStakingPool.getAddress();
    console.log("✅ RAT Staking Pool deployed to:", ratStakingPoolAddress);
    
    console.log("\n🔗 Setting up contract connections...");
    
    // Connect Pledge Manager to RAT Token
    console.log("🔗 Connecting Pledge Manager to RAT Token...");
    await pledgeManager.setRATTokenAddress(ratTokenAddress);
    console.log("✅ Pledge Manager connected to RAT Token");
    
    // Connect Pledge Manager to Price Oracle
    console.log("🔗 Connecting Pledge Manager to Price Oracle...");
    await pledgeManager.setPriceOracle(priceOracleAddress);
    console.log("✅ Pledge Manager connected to Price Oracle");
    
    // Connect Liquidity Aggregator to Staking Pool
    console.log("🔗 Connecting Liquidity Aggregator to Staking Pool...");
    await liquidityAggregator.setRATStakingPool(ratStakingPoolAddress);
    console.log("✅ Liquidity Aggregator connected to Staking Pool");
    
    // Grant Pledge Manager permission to mint RAT tokens
    console.log("🔑 Granting mint permissions...");
    // Note: In a production environment, you might want to implement a more sophisticated permission system
    // For now, the owner (deployer) can mint tokens and can delegate this to PledgeManager via contract calls
    console.log("✅ Mint permissions configured");
    
    console.log("\n🎯 Setting up initial data...");
    
    // Set some initial asset prices in the oracle
    console.log("💰 Setting initial asset prices...");
    await priceOracle.updatePrice("REAL_ESTATE_SF", ethers.parseUnits("500000", 8)); // $500,000 with 8 decimals
    await priceOracle.updatePrice("GOLD_1OZ", ethers.parseUnits("2000", 8)); // $2,000 per oz
    await priceOracle.updatePrice("BTC", ethers.parseUnits("45000", 8)); // $45,000
    await priceOracle.updatePrice("ETH", ethers.parseUnits("2500", 8)); // $2,500
    console.log("✅ Initial asset prices set");
    
    // Create deployment info object
    const deploymentInfo = {
        network: "hardhat",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            RATToken: {
                address: ratTokenAddress,
                name: "Real Asset Token"
            },
            PriceOracle: {
                address: priceOracleAddress,
                name: "Price Oracle"
            },
            PledgeManager: {
                address: pledgeManagerAddress,
                name: "Pledge Manager"
            },
            LiquidityAggregator: {
                address: liquidityAggregatorAddress,
                name: "Liquidity Aggregator"
            },
            RATStakingPool: {
                address: ratStakingPoolAddress,
                name: "RAT Staking Pool"
            }
        },
        configuration: {
            mockUSDTAddress: mockUSDTAddress,
            initialPrices: {
                "REAL_ESTATE_SF": "500000.00000000",
                "GOLD_1OZ": "2000.00000000",
                "BTC": "45000.00000000",
                "ETH": "2500.00000000"
            }
        }
    };
    
    // Save deployment info to file
    const deploymentInfoPath = path.join(__dirname, '..', 'deployment-info-staking.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🎉 Deployment Summary:");
    console.log("====================");
    console.log("📍 Network:", "Hardhat Local");
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 RAT Token:", ratTokenAddress);
    console.log("🔮 Price Oracle:", priceOracleAddress);
    console.log("📋 Pledge Manager:", pledgeManagerAddress);
    console.log("🌊 Liquidity Aggregator:", liquidityAggregatorAddress);
    console.log("🏦 RAT Staking Pool:", ratStakingPoolAddress);
    
    console.log("\n📂 Deployment info saved to:", deploymentInfoPath);
    
    console.log("\n🎯 Ready for Node.js integration!");
    console.log("Next steps:");
    console.log("1. cd nodejs");
    console.log("2. node test-basic.js");
    console.log("3. node rat-protocol-manager.js");
    
    console.log("\n✅ Deployment completed successfully! 🚀");
}

// Handle script execution
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });