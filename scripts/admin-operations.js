// admin-operations.js
const { ethers } = require("hardhat");
const fs = require('fs');

// Load deployment info
function loadDeploymentInfo() {
    try {
        const data = fs.readFileSync('./deployment-info.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Please run deployment first!");
        process.exit(1);
    }
}

// Load oracle deployment info
function loadOracleDeployment() {
    try {
        const data = fs.readFileSync('./oracle-deployment.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null; // Oracle not deployed yet
    }
}

class AdminOperations {
    constructor() {
        this.deploymentInfo = loadDeploymentInfo();
        this.oracleInfo = loadOracleDeployment();
        this.contracts = {};
    }
    
    async init() {
        const [signer] = await ethers.getSigners();
        this.signer = signer;
        
        // Load contract instances
        this.contracts.ratToken = await ethers.getContractAt(
            "RATToken", 
            this.deploymentInfo.contracts.RATToken,
            signer
        );
        
        this.contracts.pledgeManager = await ethers.getContractAt(
            "PledgeManager", 
            this.deploymentInfo.contracts.PledgeManager,
            signer
        );
        
        this.contracts.liquidityAggregator = await ethers.getContractAt(
            "LiquidityAggregator", 
            this.deploymentInfo.contracts.LiquidityAggregator,
            signer
        );
        
        // Load Price Oracle if available
        if (this.oracleInfo && this.oracleInfo.PriceOracle) {
            try {
                this.contracts.priceOracle = await ethers.getContractAt(
                    "PriceOracle",
                    this.oracleInfo.PriceOracle,
                    signer
                );
                console.log("Price Oracle loaded:", this.oracleInfo.PriceOracle);
            } catch (error) {
                console.log("⚠️ Price Oracle not available");
            }
        }
        
        console.log("Admin Operations initialized for:", signer.address);
    }
    
    // View all pending pledges
    async viewPendingPledges() {
        console.log("\n📋 PENDING PLEDGES:");
        console.log("=".repeat(80));
        
        for (let i = 1; i <= 10; i++) {
            try {
                const pledge = await this.contracts.pledgeManager.pledges(i);
                if (pledge.status === 0) { // Pending
                    console.log(`Pledge ID: ${i}`);
                    console.log(`Pledger: ${pledge.pledger}`);
                    console.log(`Asset: ${pledge.assetDescription}`);
                    console.log(`Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
                    console.log(`Asset Address: ${pledge.assetAddress || 'N/A'}`);
                    console.log(`Document: ${pledge.documentHash}`);
                    console.log(`Pledge Time: ${new Date(pledge.pledgeTime * 1000).toLocaleString()}`);
                    
                    // Show price validation if oracle is available
                    if (this.contracts.priceOracle && pledge.assetAddress && pledge.assetAddress !== ethers.constants.AddressZero) {
                        try {
                            const validation = await this.contracts.pledgeManager.validatePledgeValue(i);
                            console.log(`🔍 Price Validation: ${validation.status}`);
                            if (validation.currentMarketValue.gt(0)) {
                                console.log(`📈 Market Value: $${ethers.utils.formatEther(validation.currentMarketValue)}`);
                                console.log(`📊 Deviation: ${validation.deviation / 100}%`);
                            }
                        } catch (error) {
                            console.log(`🔍 Price Validation: Not available`);
                        }
                    }
                    
                    console.log("-".repeat(40));
                }
            } catch (error) {
                // Pledge doesn't exist, continue
            }
        }
    }
    
    // Approve an asset pledge
    async approveAsset(pledgeId, approvedValue) {
        console.log(`\n✅ APPROVING ASSET PLEDGE ${pledgeId}:`);
        
        try {
            // Pre-validation check if oracle is available
            if (this.contracts.priceOracle) {
                try {
                    const validation = await this.contracts.pledgeManager.validatePledgeValue(pledgeId);
                    console.log(`🔍 Pre-approval validation: ${validation.status}`);
                    if (!validation.isValid) {
                        console.log(`⚠️ Warning: ${validation.status}`);
                        console.log(`📊 Current deviation: ${validation.deviation / 100}%`);
                    }
                } catch (error) {
                    console.log("🔍 Price validation not available");
                }
            }
            
            const tx = await this.contracts.pledgeManager.approveAsset(
                pledgeId,
                ethers.utils.parseEther(approvedValue.toString())
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log("✓ Asset approved successfully!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Get the pledge details to show RAT tokens issued
            const pledge = await this.contracts.pledgeManager.pledges(pledgeId);
            console.log(`RAT Tokens Issued: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
            if (pledge.marketValueAtApproval.gt(0)) {
                console.log(`Market Value at Approval: $${ethers.utils.formatEther(pledge.marketValueAtApproval)}`);
            }
            if (pledge.autoStaked) {
                console.log(`✓ Auto-staking enabled for this pledge`);
            }
            
        } catch (error) {
            console.error("❌ Approval failed:", error.message);
        }
    }
    
    // Reject an asset pledge
    async rejectAsset(pledgeId, reason) {
        console.log(`\n❌ REJECTING ASSET PLEDGE ${pledgeId}:`);
        
        try {
            const tx = await this.contracts.pledgeManager.rejectAsset(pledgeId, reason);
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✓ Asset rejected successfully!");
            console.log("Reason:", reason);
            
        } catch (error) {
            console.error("❌ Rejection failed:", error.message);
        }
    }
    
    // Validate pledge price using oracle
    async validatePledgePrice(pledgeId) {
        console.log(`\n🔍 VALIDATING PLEDGE ${pledgeId} PRICE:`);
        
        if (!this.contracts.priceOracle) {
            console.error("❌ Price Oracle not available");
            return;
        }
        
        try {
            const result = await this.contracts.pledgeManager.validatePledgeValue(pledgeId);
            
            console.log(`Is Valid: ${result.isValid ? '✅' : '❌'}`);
            console.log(`Current Market Value: $${ethers.utils.formatEther(result.currentMarketValue)}`);
            console.log(`Deviation: ${result.deviation / 100}%`);
            console.log(`Status: ${result.status}`);
            
            // Get pledge details for comparison
            const pledge = await this.contracts.pledgeManager.pledges(pledgeId);
            console.log(`Estimated Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
            
        } catch (error) {
            console.error("❌ Failed to validate pledge price:", error.message);
        }
    }
    
    // Get asset market value from oracle
    async getAssetMarketValue(assetAddress) {
        console.log(`\n💰 ASSET MARKET VALUE FOR ${assetAddress}:`);
        
        if (!this.contracts.priceOracle) {
            console.error("❌ Price Oracle not available");
            return;
        }
        
        try {
            const [marketValue, isFresh] = await this.contracts.pledgeManager.getAssetCurrentMarketValue(assetAddress);
            
            console.log(`Market Value: $${ethers.utils.formatEther(marketValue)}`);
            console.log(`Price Fresh: ${isFresh ? '✅' : '❌'}`);
            
            if (isFresh) {
                const [price, timestamp] = await this.contracts.priceOracle.getLatestPrice(assetAddress);
                console.log(`Raw Price: $${price / 10**8}`);
                console.log(`Last Updated: ${new Date(timestamp * 1000).toLocaleString()}`);
            }
            
        } catch (error) {
            console.error("❌ Failed to get market value:", error.message);
        }
    }
    
    // Add price feed to oracle
    async addPriceFeed(assetAddress, feedAddress, assetName) {
        console.log(`\n📈 ADDING PRICE FEED FOR ${assetName}:`);
        
        if (!this.contracts.priceOracle) {
            console.error("❌ Price Oracle not available");
            return;
        }
        
        try {
            const tx = await this.contracts.priceOracle.addPriceFeed(
                assetAddress,
                feedAddress,
                assetName
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✓ Price feed added successfully!");
            
            // Test the feed
            try {
                const [price, timestamp] = await this.contracts.priceOracle.getLatestPrice(assetAddress);
                console.log(`✓ Feed test successful - Price: $${price / 10**8}`);
            } catch (error) {
                console.log("⚠️ Feed test failed:", error.message);
            }
            
        } catch (error) {
            console.error("❌ Failed to add price feed:", error.message);
        }
    }
    
    // Set price oracle in pledge manager
    async setPriceOracle(oracleAddress) {
        console.log(`\n🔗 SETTING PRICE ORACLE TO ${oracleAddress}:`);
        
        try {
            const tx = await this.contracts.pledgeManager.setPriceOracle(oracleAddress);
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✓ Price oracle set successfully!");
            
        } catch (error) {
            console.error("❌ Failed to set price oracle:", error.message);
        }
    }
    
    // Configure price verification settings
    async configurePriceVerification(enabled, maxDeviation) {
        console.log(`\n⚙️ CONFIGURING PRICE VERIFICATION:`);
        console.log(`Enabled: ${enabled}`);
        console.log(`Max Deviation: ${maxDeviation}%`);
        
        try {
            const maxDeviationBasisPoints = Math.floor(maxDeviation * 100); // Convert % to basis points
            const tx = await this.contracts.pledgeManager.setPriceVerificationConfig(
                enabled,
                maxDeviationBasisPoints
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✓ Price verification configured successfully!");
            
        } catch (error) {
            console.error("❌ Failed to configure price verification:", error.message);
        }
    }
    
    // Execute swap for user
    async executeSwapForUser(userAddress, ratAmount, minUSDT) {
        console.log(`\n💱 EXECUTING SWAP FOR USER ${userAddress}:`);
        
        try {
            // Check user's RAT balance first
            const [custodyBalance, stakedBalance, totalBalance] = await this.contracts.pledgeManager.getUserTotalRAT(userAddress);
            console.log(`User's RAT Balance:`);
            console.log(`  In Custody: ${ethers.utils.formatEther(custodyBalance)}`);
            console.log(`  Staked: ${ethers.utils.formatEther(stakedBalance)}`);
            console.log(`  Total: ${ethers.utils.formatEther(totalBalance)}`);
            
            if (custodyBalance.lt(ethers.utils.parseEther(ratAmount.toString()))) {
                console.error("❌ User has insufficient RAT balance in custody");
                return;
            }
            
            const tx = await this.contracts.pledgeManager.adminSwapRATForUser(
                userAddress,
                ethers.utils.parseEther(ratAmount.toString()),
                ethers.utils.parseUnits(minUSDT.toString(), 6), // USDT has 6 decimals
                "0x" // Empty swap data for now
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✓ Swap executed successfully!");
            
        } catch (error) {
            console.error("❌ Swap failed:", error.message);
        }
    }
    
    // View system statistics
    async viewSystemStats() {
        console.log("\n📊 SYSTEM STATISTICS:");
        console.log("=".repeat(50));
        
        try {
            // RAT Token stats
            const totalSupply = await this.contracts.ratToken.totalSupply();
            const maxSupply = await this.contracts.ratToken.MAX_SUPPLY();
            
            console.log("RAT Token:");
            console.log(`  Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
            console.log(`  Max Supply: ${ethers.utils.formatEther(maxSupply)}`);
            console.log(`  Utilization: ${(totalSupply * 100 / maxSupply).toFixed(2)}%`);
            
            // Pledge Manager stats
            const totalRATInCustody = await this.contracts.pledgeManager.totalRATInCustody();
            const nextPledgeId = await this.contracts.pledgeManager.nextPledgeId();
            
            console.log("\nPledge Manager:");
            console.log(`  Total RAT in Custody: ${ethers.utils.formatEther(totalRATInCustody)}`);
            console.log(`  Total Pledges: ${nextPledgeId.sub(1)}`);
            
            // Price verification settings
            try {
                const priceVerificationEnabled = await this.contracts.pledgeManager.priceVerificationEnabled();
                const maxPriceDeviation = await this.contracts.pledgeManager.maxPriceDeviation();
                console.log(`  Price Verification: ${priceVerificationEnabled ? 'Enabled' : 'Disabled'}`);
                console.log(`  Max Price Deviation: ${maxPriceDeviation / 100}%`);
            } catch (error) {
                console.log(`  Price Verification: Not available`);
            }
            
            // Auto-staking settings
            try {
                const autoStakeEnabled = await this.contracts.pledgeManager.autoStakeEnabled();
                const autoStakePercentage = await this.contracts.pledgeManager.autoStakePercentage();
                console.log(`  Auto-Staking: ${autoStakeEnabled ? 'Enabled' : 'Disabled'}`);
                console.log(`  Auto-Stake Percentage: ${autoStakePercentage / 100}%`);
            } catch (error) {
                console.log(`  Auto-Staking: Not available`);
            }
            
            // Liquidity Aggregator stats
            const aggregatorFee = await this.contracts.liquidityAggregator.aggregatorFeePercent();
            const maxSlippage = await this.contracts.liquidityAggregator.maxSlippage();
            
            console.log("\nLiquidity Aggregator:");
            console.log(`  Fee Percentage: ${aggregatorFee / 100}%`);
            console.log(`  Max Slippage: ${maxSlippage / 100}%`);
            
            // ETH balance in aggregator
            const ethBalance = await ethers.provider.getBalance(this.contracts.liquidityAggregator.address);
            console.log(`  ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
            
            // Price Oracle stats
            if (this.contracts.priceOracle) {
                console.log("\nPrice Oracle:");
                try {
                    const stalenessThreshold = await this.contracts.priceOracle.getStalenessThreshold();
                    console.log(`  Staleness Threshold: ${stalenessThreshold} seconds`);
                    console.log(`  Oracle Address: ${this.contracts.priceOracle.address}`);
                } catch (error) {
                    console.log(`  Status: Available but limited info`);
                }
            } else {
                console.log("\nPrice Oracle: Not configured");
            }
            
        } catch (error) {
            console.error("❌ Failed to load stats:", error.message);
        }
    }
    
    // View user details
    async viewUserDetails(userAddress) {
        console.log(`\n👤 USER DETAILS FOR ${userAddress}:`);
        console.log("=".repeat(60));
        
        try {
            // Get user's total RAT balance
            const [custodyBalance, stakedBalance, totalBalance] = await this.contracts.pledgeManager.getUserTotalRAT(userAddress);
            console.log(`RAT Balances:`);
            console.log(`  In Custody: ${ethers.utils.formatEther(custodyBalance)}`);
            console.log(`  Staked: ${ethers.utils.formatEther(stakedBalance)}`);
            console.log(`  Total: ${ethers.utils.formatEther(totalBalance)}`);
            
            // Get user's pledges
            const userPledges = await this.contracts.pledgeManager.getUserPledges(userAddress);
            console.log(`\nTotal Pledges: ${userPledges.length}`);
            
            for (let pledgeId of userPledges) {
                const pledge = await this.contracts.pledgeManager.pledges(pledgeId);
                const statusText = ["🟡 Pending", "✅ Approved", "❌ Rejected"][pledge.status];
                
                console.log(`\nPledge ID ${pledgeId}:`);
                console.log(`  Status: ${statusText}`);
                console.log(`  Asset: ${pledge.assetDescription}`);
                console.log(`  Estimated Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
                console.log(`  RAT Issued: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
                
                if (pledge.assetAddress && pledge.assetAddress !== ethers.constants.AddressZero) {
                    console.log(`  Asset Address: ${pledge.assetAddress}`);
                }
                
                if (pledge.marketValueAtApproval.gt(0)) {
                    console.log(`  Market Value at Approval: $${ethers.utils.formatEther(pledge.marketValueAtApproval)}`);
                }
                
                if (pledge.autoStaked) {
                    console.log(`  🔐 Auto-staked: Yes`);
                }
            }
            
        } catch (error) {
            console.error("❌ Failed to load user details:", error.message);
        }
    }
    
    // Add liquidity to aggregator
    async addLiquidity(ethAmount) {
        console.log(`\n💧 ADDING ${ethAmount} ETH LIQUIDITY:`);
        
        try {
            const tx = await this.contracts.liquidityAggregator.addETHLiquidity({
                value: ethers.utils.parseEther(ethAmount.toString())
            });
            
            console.log("Transaction hash:", tx.hash);
            await tx.wait();
            console.log("✓ Liquidity added successfully!");
            
        } catch (error) {
            console.error("❌ Failed to add liquidity:", error.message);
        }
    }
    
    // Update system settings
    async updateSettings(setting, value) {
        console.log(`\n⚙️ UPDATING SETTING: ${setting} = ${value}`);
        
        try {
            let tx;
            
            switch (setting) {
                case 'aggregatorFee':
                    tx = await this.contracts.liquidityAggregator.setAggregatorFee(value);
                    break;
                case 'maxSlippage':
                    tx = await this.contracts.liquidityAggregator.setMaxSlippage(value);
                    break;
                case 'ratConversionRate':
                    tx = await this.contracts.pledgeManager.setRATConversionRate(
                        ethers.utils.parseEther(value.toString())
                    );
                    break;
                case 'autoStakePercentage':
                    tx = await this.contracts.pledgeManager.setAutoStakeConfig(true, value * 100); // Convert % to basis points
                    break;
                case 'stalenessThreshold':
                    if (!this.contracts.priceOracle) {
                        console.error("❌ Price Oracle not available");
                        return;
                    }
                    tx = await this.contracts.priceOracle.setStalenessThreshold(value);
                    break;
                default:
                    console.error("❌ Unknown setting");
                    return;
            }
            
            console.log("Transaction hash:", tx.hash);
            await tx.wait();
            console.log("✓ Setting updated successfully!");
            
        } catch (error) {
            console.error("❌ Failed to update setting:", error.message);
        }
    }
}

// Command-line interface
async function main() {
    const admin = new AdminOperations();
    await admin.init();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'pending':
            await admin.viewPendingPledges();
            break;
            
        case 'approve':
            if (args.length < 3) {
                console.log("Usage: node admin-operations.js approve <pledgeId> <approvedValue>");
                return;
            }
            await admin.approveAsset(parseInt(args[1]), parseFloat(args[2]));
            break;
            
        case 'reject':
            if (args.length < 3) {
                console.log("Usage: node admin-operations.js reject <pledgeId> <reason>");
                return;
            }
            await admin.rejectAsset(parseInt(args[1]), args.slice(2).join(' '));
            break;
            
        case 'validate-price':
            if (args.length < 2) {
                console.log("Usage: node admin-operations.js validate-price <pledgeId>");
                return;
            }
            await admin.validatePledgePrice(parseInt(args[1]));
            break;
            
        case 'market-value':
            if (args.length < 2) {
                console.log("Usage: node admin-operations.js market-value <assetAddress>");
                return;
            }
            await admin.getAssetMarketValue(args[1]);
            break;
            
        case 'add-price-feed':
            if (args.length < 4) {
                console.log("Usage: node admin-operations.js add-price-feed <assetAddress> <feedAddress> <assetName>");
                return;
            }
            await admin.addPriceFeed(args[1], args[2], args[3]);
            break;
            
        case 'set-oracle':
            if (args.length < 2) {
                console.log("Usage: node admin-operations.js set-oracle <oracleAddress>");
                return;
            }
            await admin.setPriceOracle(args[1]);
            break;
            
        case 'configure-price-verification':
            if (args.length < 3) {
                console.log("Usage: node admin-operations.js configure-price-verification <enabled> <maxDeviation%>");
                return;
            }
            await admin.configurePriceVerification(args[1] === 'true', parseFloat(args[2]));
            break;
            
        case 'swap':
            if (args.length < 4) {
                console.log("Usage: node admin-operations.js swap <userAddress> <ratAmount> <minUSDT>");
                return;
            }
            await admin.executeSwapForUser(args[1], parseFloat(args[2]), parseFloat(args[3]));
            break;
            
        case 'stats':
            await admin.viewSystemStats();
            break;
            
        case 'user':
            if (args.length < 2) {
                console.log("Usage: node admin-operations.js user <userAddress>");
                return;
            }
            await admin.viewUserDetails(args[1]);
            break;
            
        case 'addliquidity':
            if (args.length < 2) {
                console.log("Usage: node admin-operations.js addliquidity <ethAmount>");
                return;
            }
            await admin.addLiquidity(parseFloat(args[1]));
            break;
            
        case 'setting':
            if (args.length < 3) {
                console.log("Usage: node admin-operations.js setting <settingName> <value>");
                console.log("Available settings: aggregatorFee, maxSlippage, ratConversionRate, autoStakePercentage, stalenessThreshold");
                return;
            }
            await admin.updateSettings(args[1], parseFloat(args[2]));
            break;
            
        default:
            console.log("Available commands:");
            console.log("\n📋 Pledge Management:");
            console.log("  pending                                         - View pending pledges");
            console.log("  approve <pledgeId> <value>                     - Approve asset pledge");
            console.log("  reject <pledgeId> <reason>                     - Reject asset pledge");
            console.log("  user <userAddress>                             - View user details");
            console.log("\n📈 Price Oracle:");
            console.log("  validate-price <pledgeId>                      - Validate pledge price");
            console.log("  market-value <assetAddress>                    - Get asset market value");
            console.log("  add-price-feed <assetAddr> <feedAddr> <name>   - Add Chainlink price feed");
            console.log("  set-oracle <oracleAddress>                     - Set price oracle address");
            console.log("  configure-price-verification <enabled> <max%>  - Configure price verification");
            console.log("\n💱 Trading & Liquidity:");
            console.log("  swap <userAddress> <ratAmount> <minUSDT>       - Execute swap for user");
            console.log("  addliquidity <ethAmount>                       - Add ETH liquidity");
            console.log("\n📊 System Management:");
            console.log("  stats                                          - View system statistics");
            console.log("  setting <settingName> <value>                  - Update system settings");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdminOperations;