const { config, validateConfig } = require('./config');
const ContractInteraction = require('./utils/contractInteraction');
const Logger = require('./utils/logger');
const inquirer = require('inquirer');
const chalk = require('chalk');

class RATProtocolManager {
    constructor() {
        this.logger = new Logger(config.logging);
        this.contractInteraction = new ContractInteraction(config);
        this.isInitialized = false;
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        this.logger.info('🚀 Initializing RAT Protocol Manager...');
        
        try {
            validateConfig();
            await this.contractInteraction.initialize();
            this.isInitialized = true;
            this.logger.success('RAT Protocol Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize RAT Protocol Manager', error);
            throw error;
        }
    }
    
    async showMainMenu() {
        const choices = [
            { name: '1. 📋 Submit Asset Pledge', value: 'submitPledge' },
            { name: '2. ✅ Verify Asset Pledge (Admin)', value: 'verifyPledge' },
            { name: '3. 💰 Update Asset Price', value: 'updatePrice' },
            { name: '4. 🌊 Trigger Liquidity Aggregation', value: 'aggregateLiquidity' },
            { name: '5. 🏦 Manage Staking Pool', value: 'manageStaking' },
            { name: '6. 📊 View System Stats', value: 'viewStats' },
            { name: '7. 🔄 Run Full Protocol Demo', value: 'fullDemo' },
            { name: '8. ❌ Exit', value: 'exit' }
        ];
        
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Choose an action:',
                choices: choices
            }
        ]);
        
        return action;
    }
    
    async submitAssetPledge() {
        this.logger.info('📋 Asset Pledge Submission');
        
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'assetType',
                message: 'Select asset type:',
                choices: ['REAL_ESTATE_SF', 'GOLD_1OZ', 'BTC', 'ETH', 'OTHER']
            },
            {
                type: 'number',
                name: 'assetValue',
                message: 'Enter asset value (USD):',
                validate: (value) => value > 0 || 'Asset value must be positive'
            },
            {
                type: 'input',
                name: 'ipfsHash',
                message: 'Enter IPFS hash of asset documentation:',
                default: 'QmExampleHashForTesting123456789'
            }
        ]);
        
        try {
            const receipt = await this.contractInteraction.submitAssetPledge(
                answers.assetType,
                answers.assetValue,
                answers.ipfsHash
            );
            
            this.logger.success(`Asset pledge submitted! TX: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to submit asset pledge', error);
        }
    }
    
    async verifyAssetPledge() {
        this.logger.info('✅ Asset Pledge Verification (Admin Only)');
        
        const answers = await inquirer.prompt([
            {
                type: 'number',
                name: 'pledgeId',
                message: 'Enter pledge ID to verify:',
                validate: (value) => value > 0 || 'Pledge ID must be positive'
            },
            {
                type: 'number',
                name: 'ratTokensToMint',
                message: 'Enter RAT tokens to mint:',
                validate: (value) => value > 0 || 'Token amount must be positive'
            },
            {
                type: 'input',
                name: 'verificationNotes',
                message: 'Enter verification notes:',
                default: 'Asset verified and approved for tokenization'
            }
        ]);
        
        try {
            const receipt = await this.contractInteraction.verifyAssetPledge(
                answers.pledgeId,
                answers.ratTokensToMint,
                answers.verificationNotes
            );
            
            this.logger.success(`Asset pledge verified! TX: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to verify asset pledge', error);
        }
    }
    
    async updateAssetPrice() {
        this.logger.info('💰 Asset Price Update');
        
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'asset',
                message: 'Select asset to update:',
                choices: ['REAL_ESTATE_SF', 'GOLD_1OZ', 'BTC', 'ETH']
            },
            {
                type: 'number',
                name: 'price',
                message: 'Enter new price (USD):',
                validate: (value) => value > 0 || 'Price must be positive'
            }
        ]);
        
        try {
            const receipt = await this.contractInteraction.updateAssetPrice(
                answers.asset,
                answers.price
            );
            
            this.logger.success(`Asset price updated! TX: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to update asset price', error);
        }
    }
    
    async viewSystemStats() {
        this.logger.info('📊 System Statistics');
        
        try {
            // Get basic contract stats
            const ratToken = this.contractInteraction.contracts.ratToken;
            const totalSupply = await ratToken.totalSupply();
            const adminBalance = await ratToken.balanceOf(this.contractInteraction.wallet.address);
            
            console.log(chalk.cyan('\n📈 RAT Token Statistics:'));
            console.log(`Total Supply: ${totalSupply.toString()} RAT`);
            console.log(`Admin Balance: ${adminBalance.toString()} RAT`);
            
            // Network info
            const blockNumber = await this.contractInteraction.provider.getBlockNumber();
            const gasPrice = await this.contractInteraction.provider.getFeeData();
            
            console.log(chalk.cyan('\n🌐 Network Information:'));
            console.log(`Current Block: ${blockNumber}`);
            console.log(`Gas Price: ${gasPrice.gasPrice?.toString() || 'N/A'} wei`);
            
            // Contract addresses
            console.log(chalk.cyan('\n📍 Contract Addresses:'));
            Object.entries(config.contracts).forEach(([name, address]) => {
                console.log(`${name}: ${address}`);
            });
            
        } catch (error) {
            this.logger.error('Failed to get system stats', error);
        }
    }
    
    async runFullDemo() {
        this.logger.info('🔄 Running Full Protocol Demo');
        
        try {
            this.logger.info('Step 1: Submitting sample asset pledge...');
            await this.contractInteraction.submitAssetPledge(
                'REAL_ESTATE_SF',
                500000,
                'QmSampleRealEstateHash123'
            );
            
            this.logger.info('Step 2: Verifying asset pledge...');
            await this.contractInteraction.verifyAssetPledge(
                1, // Assuming this is the first pledge
                350000, // 70% of asset value in RAT tokens
                'Real estate verified and approved'
            );
            
            this.logger.info('Step 3: Updating asset prices...');
            await this.contractInteraction.updateAssetPrice('BTC', 46000);
            
            this.logger.success('🎉 Full protocol demo completed successfully!');
            
        } catch (error) {
            this.logger.error('Demo failed', error);
        }
    }
    
    async run() {
        console.log(chalk.blue.bold('\n🏛️  RAT Protocol Management System'));
        console.log(chalk.blue('========================================\n'));
        
        await this.initialize();
        
        while (true) {
            try {
                const action = await this.showMainMenu();
                
                switch (action) {
                    case 'submitPledge':
                        await this.submitAssetPledge();
                        break;
                    case 'verifyPledge':
                        await this.verifyAssetPledge();
                        break;
                    case 'updatePrice':
                        await this.updateAssetPrice();
                        break;
                    case 'viewStats':
                        await this.viewSystemStats();
                        break;
                    case 'fullDemo':
                        await this.runFullDemo();
                        break;
                    case 'exit':
                        this.logger.info('👋 Goodbye!');
                        process.exit(0);
                        break;
                    default:
                        this.logger.warn('Feature not implemented yet');
                }
                
                // Pause before showing menu again
                await inquirer.prompt([{
                    type: 'input',
                    name: 'continue',
                    message: 'Press Enter to continue...'
                }]);
                
            } catch (error) {
                this.logger.error('An error occurred', error);
            }
        }
    }
}

// Handle script execution
if (require.main === module) {
    const manager = new RATProtocolManager();
    manager.run().catch((error) => {
        console.error('❌ RAT Protocol Manager failed:', error.message);
        process.exit(1);
    });
}

module.exports = RATProtocolManager;