require('dotenv').config();
const path = require('path');

const config = {
    // Network Configuration
    network: {
        name: process.env.NETWORK || 'hardhat',
        rpcUrl: process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
        chainId: 31337 // Hardhat default
    },
    
    // Contract Addresses
    contracts: {
        ratToken: process.env.RAT_TOKEN_ADDRESS,
        priceOracle: process.env.PRICE_ORACLE_ADDRESS,
        pledgeManager: process.env.PLEDGE_MANAGER_ADDRESS,
        liquidityAggregator: process.env.LIQUIDITY_AGGREGATOR_ADDRESS,
        ratStakingPool: process.env.RAT_STAKING_POOL_ADDRESS,
        mockUSDT: process.env.MOCK_USDT_ADDRESS
    },
    
    // Wallet Configuration
    wallet: {
        privateKey: process.env.PRIVATE_KEY,
        deployerAddress: process.env.DEPLOYER_ADDRESS
    },
    
    // Protocol Settings
    protocol: {
        minPledgeValue: 1000, // $1,000 minimum
        defaultCollateralRatio: 0.7, // 70% collateral ratio
        stakingRewardRate: 0.1, // 10% APY
        liquidationThreshold: 0.8 // 80% threshold
    },
    
    // Asset Prices (fallback)
    assetPrices: {
        'REAL_ESTATE_SF': process.env.REAL_ESTATE_SF_PRICE || '500000',
        'GOLD_1OZ': process.env.GOLD_1OZ_PRICE || '2000',
        'BTC': process.env.BTC_PRICE || '45000',
        'ETH': process.env.ETH_PRICE || '2500'
    },
    
    // Logging Configuration
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false
    },
    
    // File Paths
    paths: {
        deploymentInfo: path.join(__dirname, '..', 'deployment-info-staking.json'),
        abis: path.join(__dirname, '..', 'artifacts', 'contracts'),
        logs: path.join(__dirname, 'logs')
    }
};

// Validation
function validateConfig() {
    const required = [
        'contracts.ratToken',
        'contracts.priceOracle', 
        'contracts.pledgeManager',
        'contracts.liquidityAggregator',
        'contracts.ratStakingPool',
        'wallet.privateKey'
    ];
    
    for (const key of required) {
        const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
        if (!value) {
            throw new Error(`Missing required configuration: ${key}`);
        }
    }
    
    console.log('✅ Configuration validated successfully');
    return true;
}

module.exports = {
    config,
    validateConfig
};