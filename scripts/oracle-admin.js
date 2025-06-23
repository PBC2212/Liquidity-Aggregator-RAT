// scripts/oracle-admin.js
const { ethers } = require("hardhat");
const fs = require('fs');

function loadOracleDeployment() {
    try {
        const data = fs.readFileSync('./oracle-deployment.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Oracle deployment info not found! Run deploy-oracle.js first.");
        process.exit(1);
    }
}

async function main() {
    const [signer] = await ethers.getSigners();
    const deploymentInfo = loadOracleDeployment();
    
    const priceOracle = await ethers.getContractAt(
        "PriceOracle", 
        deploymentInfo.PriceOracle,
        signer
    );
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'add-feed':
            if (args.length < 4) {
                console.log("Usage: node oracle-admin.js add-feed <assetAddress> <feedAddress> <name>");
                return;
            }
            await addPriceFeed(priceOracle, args[1], args[2], args[3]);
            break;
            
        case 'get-price':
            if (args.length < 2) {
                console.log("Usage: node oracle-admin.js get-price <assetAddress>");
                return;
            }
            await getPrice(priceOracle, args[1]);
            break;
            
        case 'check-freshness':
            if (args.length < 2) {
                console.log("Usage: node oracle-admin.js check-freshness <assetAddress>");
                return;
            }
            await checkFreshness(priceOracle, args[1]);
            break;
            
        case 'set-threshold':
            if (args.length < 2) {
                console.log("Usage: node oracle-admin.js set-threshold <seconds>");
                return;
            }
            await setStalenessThreshold(priceOracle, parseInt(args[1]));
            break;
            
        case 'convert-usd':
            if (args.length < 3) {
                console.log("Usage: node oracle-admin.js convert-usd <assetAddress> <amount>");
                return;
            }
            await convertToUSD(priceOracle, args[1], args[2]);
            break;
            
        default:
            console.log("Available commands:");
            console.log("  add-feed <assetAddress> <feedAddress> <name>");
            console.log("  get-price <assetAddress>");
            console.log("  check-freshness <assetAddress>");
            console.log("  set-threshold <seconds>");
            console.log("  convert-usd <assetAddress> <amount>");
    }
}

async function addPriceFeed(oracle, assetAddress, feedAddress, name) {
    try {
        console.log(`Adding price feed for ${name}...`);
        const tx = await oracle.addPriceFeed(assetAddress, feedAddress, name);
        await tx.wait();
        console.log("✓ Price feed added successfully");
    } catch (error) {
        console.error("❌ Failed to add price feed:", error.message);
    }
}

async function getPrice(oracle, assetAddress) {
    try {
        const [price, timestamp] = await oracle.getLatestPrice(assetAddress);
        console.log(`Price: $${price / 10**8}`);
        console.log(`Last updated: ${new Date(timestamp * 1000).toLocaleString()}`);
    } catch (error) {
        console.error("❌ Failed to get price:", error.message);
    }
}

async function checkFreshness(oracle, assetAddress) {
    try {
        const isFresh = await oracle.isPriceFresh(assetAddress);
        console.log(`Price is ${isFresh ? 'FRESH' : 'STALE'}`);
    } catch (error) {
        console.error("❌ Failed to check freshness:", error.message);
    }
}

async function setStalenessThreshold(oracle, seconds) {
    try {
        const tx = await oracle.setStalenessThreshold(seconds);
        await tx.wait();
        console.log(`✓ Staleness threshold set to ${seconds} seconds`);
    } catch (error) {
        console.error("❌ Failed to set threshold:", error.message);
    }
}

async function convertToUSD(oracle, assetAddress, amount) {
    try {
        const amountWei = ethers.utils.parseEther(amount);
        const usdValue = await oracle.convertToUSD(assetAddress, amountWei);
        console.log(`USD Value: $${usdValue / 10**8}`);
    } catch (error) {
        console.error("❌ Failed to convert to USD:", error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}