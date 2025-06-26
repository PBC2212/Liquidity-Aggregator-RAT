const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class ContractInteraction {
    constructor(config) {
        this.config = config;
        this.logger = new Logger(config.logging);
        this.provider = null;
        this.wallet = null;
        this.contracts = {};
    }
    
    async initialize() {
        try {
            // Setup provider
            this.provider = new ethers.JsonRpcProvider(this.config.network.rpcUrl);
            this.logger.info(`Connected to ${this.config.network.name} network`);
            
            // Setup wallet
            this.wallet = new ethers.Wallet(this.config.wallet.privateKey, this.provider);
            this.logger.info(`Wallet connected: ${this.wallet.address}`);
            
            // Load contract ABIs and create contract instances
            await this._loadContracts();
            
            this.logger.success('Contract interaction initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize contract interaction', error);
            throw error;
        }
    }
    
    async _loadContracts() {
        const contractConfigs = [
            { name: 'ratToken', address: this.config.contracts.ratToken, contractName: 'RATToken' },
            { name: 'priceOracle', address: this.config.contracts.priceOracle, contractName: 'PriceOracle' },
            { name: 'pledgeManager', address: this.config.contracts.pledgeManager, contractName: 'PledgeManager' },
            { name: 'liquidityAggregator', address: this.config.contracts.liquidityAggregator, contractName: 'LiquidityAggregator' },
            { name: 'ratStakingPool', address: this.config.contracts.ratStakingPool, contractName: 'RATStakingPool' }
        ];
        
        for (const contractConfig of contractConfigs) {
            const abi = await this._loadABI(contractConfig.contractName);
            this.contracts[contractConfig.name] = new ethers.Contract(
                contractConfig.address,
                abi,
                this.wallet
            );
            this.logger.contract(contractConfig.address, contractConfig.contractName);
        }
    }
    
    async _loadABI(contractName) {
        try {
            const artifactPath = path.join(
                this.config.paths.abis,
                `${contractName}.sol`,
                `${contractName}.json`
            );
            
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                return artifact.abi;
            } else {
                // Fallback: try to load from deployment info or use minimal ABI
                this.logger.warn(`ABI file not found for ${contractName}, using minimal ABI`);
                return this._getMinimalABI(contractName);
            }
        } catch (error) {
            this.logger.error(`Failed to load ABI for ${contractName}`, error);
            throw error;
        }
    }
    
    _getMinimalABI(contractName) {
        // Minimal ABIs for basic functionality
        const minimalABIs = {
            RATToken: [
                "function balanceOf(address owner) view returns (uint256)",
                "function totalSupply() view returns (uint256)",
                "function mint(address to, uint256 amount, string reason) external",
                "function burn(uint256 amount, string reason) external"
            ],
            PriceOracle: [
                "function getPrice(string asset) view returns (uint256)",
                "function updatePrice(string asset, uint256 price) external",
                "function isPriceAvailable(string asset) view returns (bool, bool)"
            ],
            PledgeManager: [
                "function submitPledge(string assetType, uint256 assetValue, string ipfsHash) external",
                "function verifyPledge(uint256 pledgeId, uint256 ratTokensToMint, string verificationNotes) external",
                "function getPledge(uint256 pledgeId) view returns (tuple)"
            ],
            LiquidityAggregator: [
                "function aggregateLiquidity(address fromToken, uint256 amountIn, uint256 amountOutMin) external",
                "function getStats() view returns (uint256, uint256, uint256)"
            ],
            RATStakingPool: [
                "function stake(uint256 amount) external",
                "function unstake(uint256 amount) external", 
                "function claimRewards() external",
                "function getStakeInfo(address account) view returns (uint256, uint256, uint256, uint256, bool)"
            ]
        };
        
        return minimalABIs[contractName] || [];
    }
    
    // Contract interaction methods
    async getContractStats() {
        try {
            const stats = {
                ratToken: {
                    totalSupply: await this.contracts.ratToken.totalSupply(),
                    adminBalance: await this.contracts.ratToken.balanceOf(this.wallet.address)
                },
                pledgeManager: {
                    // Add pledge manager stats
                },
                stakingPool: {
                    // Add staking pool stats
                }
            };
            
            return stats;
        } catch (error) {
            this.logger.error('Failed to get contract stats', error);
            throw error;
        }
    }
    
    async submitAssetPledge(assetType, assetValue, ipfsHash) {
        try {
            this.logger.info(`Submitting pledge: ${assetType} worth $${assetValue}`);
            
            const tx = await this.contracts.pledgeManager.submitPledge(
                assetType,
                ethers.parseUnits(assetValue.toString(), 8), // Assuming 8 decimals for USD
                ipfsHash
            );
            
            this.logger.transaction(tx.hash, 'Asset pledge submission');
            const receipt = await tx.wait();
            
            this.logger.success(`Pledge submitted successfully in block ${receipt.blockNumber}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to submit asset pledge', error);
            throw error;
        }
    }
    
    async verifyAssetPledge(pledgeId, ratTokensToMint, verificationNotes) {
        try {
            this.logger.info(`Verifying pledge #${pledgeId} - minting ${ratTokensToMint} RAT tokens`);
            
            const tx = await this.contracts.pledgeManager.verifyPledge(
                pledgeId,
                ethers.parseUnits(ratTokensToMint.toString(), 18), // RAT token has 18 decimals
                verificationNotes
            );
            
            this.logger.transaction(tx.hash, 'Asset pledge verification');
            const receipt = await tx.wait();
            
            this.logger.success(`Pledge verified successfully in block ${receipt.blockNumber}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to verify asset pledge', error);
            throw error;
        }
    }
    
    async updateAssetPrice(asset, price) {
        try {
            this.logger.info(`Updating price for ${asset}: $${price}`);
            
            const tx = await this.contracts.priceOracle.updatePrice(
                asset,
                ethers.parseUnits(price.toString(), 8) // Price with 8 decimals
            );
            
            this.logger.transaction(tx.hash, `Price update for ${asset}`);
            const receipt = await tx.wait();
            
            this.logger.success(`Price updated successfully in block ${receipt.blockNumber}`);
            return receipt;
        } catch (error) {
            this.logger.error('Failed to update asset price', error);
            throw error;
        }
    }
}

module.exports = ContractInteraction;