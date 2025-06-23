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

class AdminOperations {
    constructor() {
        this.deploymentInfo = loadDeploymentInfo();
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
                    console.log(`Document: ${pledge.documentHash}`);
                    console.log(`Pledge Time: ${new Date(pledge.pledgeTime * 1000).toLocaleString()}`);
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
    
    // Execute swap for user
    async executeSwapForUser(userAddress, ratAmount, minUSDT) {
        console.log(`\n💱 EXECUTING SWAP FOR USER ${userAddress}:`);
        
        try {
            // Check user's RAT balance first
            const userBalance = await this.contracts.pledgeManager.getUserRATBalance(userAddress);
            console.log(`User's RAT Balance: ${ethers.utils.formatEther(userBalance)}`);
            
            if (userBalance.lt(ethers.utils.parseEther(ratAmount.toString()))) {
                console.error("❌ User has insufficient RAT balance");
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
            
            // Liquidity Aggregator stats
            const aggregatorFee = await this.contracts.liquidityAggregator.aggregatorFeePercent();
            const maxSlippage = await this.contracts.liquidityAggregator.maxSlippage();
            
            console.log("\nLiquidity Aggregator:");
            console.log(`  Fee Percentage: ${aggregatorFee / 100}%`);
            console.log(`  Max Slippage: ${maxSlippage / 100}%`);
            
            // ETH balance in aggregator
            const ethBalance = await ethers.provider.getBalance(this.contracts.liquidityAggregator.address);
            console.log(`  ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
            
        } catch (error) {
            console.error("❌ Failed to load stats:", error.message);
        }
    }
    
    // View user details
    async viewUserDetails(userAddress) {
        console.log(`\n👤 USER DETAILS FOR ${userAddress}:`);
        console.log("=".repeat(60));
        
        try {
            // Get user's RAT balance
            const ratBalance = await this.contracts.pledgeManager.getUserRATBalance(userAddress);
            console.log(`RAT Balance in Custody: ${ethers.utils.formatEther(ratBalance)}`);
            
            // Get user's pledges
            const userPledges = await this.contracts.pledgeManager.getUserPledges(userAddress);
            console.log(`Total Pledges: ${userPledges.length}`);
            
            for (let pledgeId of userPledges) {
                const pledge = await this.contracts.pledgeManager.pledges(pledgeId);
                const statusText = ["Pending", "Approved", "Rejected"][pledge.status];
                
                console.log(`\nPledge ID ${pledgeId}:`);
                console.log(`  Status: ${statusText}`);
                console.log(`  Asset: ${pledge.assetDescription}`);
                console.log(`  Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
                console.log(`  RAT Issued: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
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
                console.log("Available settings: aggregatorFee, maxSlippage, ratConversionRate");
                return;
            }
            await admin.updateSettings(args[1], parseFloat(args[2]));
            break;
            
        default:
            console.log("Available commands:");
            console.log("  pending                                    - View pending pledges");
            console.log("  approve <pledgeId> <value>                - Approve asset pledge");
            console.log("  reject <pledgeId> <reason>                - Reject asset pledge");
            console.log("  swap <userAddress> <ratAmount> <minUSDT>  - Execute swap for user");
            console.log("  stats                                     - View system statistics");
            console.log("  user <userAddress>                        - View user details");
            console.log("  addliquidity <ethAmount>                  - Add ETH liquidity");
            console.log("  setting <settingName> <value>             - Update system settings");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdminOperations;