const { config, validateConfig } = require('./config');
const ContractInteraction = require('./utils/contractInteraction');
const Logger = require('./utils/logger');

async function main() {
    const logger = new Logger(config.logging);
    
    logger.info('🚀 RAT Protocol - Basic Connection Test');
    logger.info('=====================================');
    
    try {
        // Validate configuration
        logger.info('📋 Validating configuration...');
        validateConfig();
        
        // Initialize contract interaction
        logger.info('🔗 Initializing contract connections...');
        const contractInteraction = new ContractInteraction(config);
        await contractInteraction.initialize();
        
        // Test basic connectivity
        logger.info('🧪 Testing basic contract connectivity...');
        
        // Test 1: Get RAT token info
        logger.info('Test 1: RAT Token Information');
        const totalSupply = await contractInteraction.contracts.ratToken.totalSupply();
        const adminBalance = await contractInteraction.contracts.ratToken.balanceOf(config.wallet.deployerAddress);
        
        logger.success(`RAT Token Total Supply: ${totalSupply.toString()}`);
        logger.success(`Admin RAT Balance: ${adminBalance.toString()}`);
        
        // Test 2: Check price oracle
        logger.info('Test 2: Price Oracle Check');
        try {
            const btcPrice = await contractInteraction.contracts.priceOracle.getPrice('BTC');
            logger.success(`BTC Price from Oracle: $${btcPrice.toString()}`);
        } catch (error) {
            logger.warn('Could not fetch BTC price - this is normal if not set');
        }
        
        // Test 3: Check network info
        logger.info('Test 3: Network Information');
        const network = await contractInteraction.provider.getNetwork();
        const blockNumber = await contractInteraction.provider.getBlockNumber();
        const gasPrice = await contractInteraction.provider.getFeeData();
        
        logger.success(`Network: ${network.name} (Chain ID: ${network.chainId})`);
        logger.success(`Current Block: ${blockNumber}`);
        logger.success(`Gas Price: ${gasPrice.gasPrice?.toString() || 'N/A'} wei`);
        
        // Test 4: Wallet info
        logger.info('Test 4: Wallet Information');
        const balance = await contractInteraction.provider.getBalance(contractInteraction.wallet.address);
        logger.success(`Wallet Address: ${contractInteraction.wallet.address}`);
        logger.success(`ETH Balance: ${balance.toString()} wei`);
        
        // Contract addresses summary
        logger.info('📍 Contract Addresses Summary:');
        logger.info(`RAT Token: ${config.contracts.ratToken}`);
        logger.info(`Price Oracle: ${config.contracts.priceOracle}`);
        logger.info(`Pledge Manager: ${config.contracts.pledgeManager}`);
        logger.info(`Liquidity Aggregator: ${config.contracts.liquidityAggregator}`);
        logger.info(`RAT Staking Pool: ${config.contracts.ratStakingPool}`);
        
        logger.success('🎉 All basic connectivity tests passed!');
        logger.info('✅ Ready for RAT Protocol operations');
        
    } catch (error) {
        logger.error('❌ Basic connectivity test failed', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => {
            console.log('\n🚀 Test completed successfully!');
            console.log('Next step: Run "node rat-protocol-manager.js" for full protocol management');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = main;