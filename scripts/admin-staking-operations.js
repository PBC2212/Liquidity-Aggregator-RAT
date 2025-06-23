// admin-staking-operations.js
const { ethers } = require("hardhat");
const fs = require('fs');

// Load deployment info
function loadDeploymentInfo() {
    try {
        // Try to load staking deployment info first
        if (fs.existsSync('./deployment-info-staking.json')) {
            const data = fs.readFileSync('./deployment-info-staking.json', 'utf8');
            return JSON.parse(data);
        }
        // Fallback to regular deployment info
        const data = fs.readFileSync('./deployment-info.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Please run deployment first!");
        process.exit(1);
    }
}

class AdminStakingOperations {
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
        
        // Load staking pool if available
        if (this.deploymentInfo.contracts.RATStakingPool) {
            this.contracts.ratStakingPool = await ethers.getContractAt(
                "RATStakingPool", 
                this.deploymentInfo.contracts.RATStakingPool,
                signer
            );
        }
        
        console.log("🎯 Admin Staking Operations initialized for:", signer.address);
        if (this.contracts.ratStakingPool) {
            console.log("✅ Staking Pool detected and connected");
        } else {
            console.log("⚠️  No staking pool detected - limited functionality");
        }
    }
    
    // View staking pool statistics
    async viewStakingStats() {
        if (!this.contracts.ratStakingPool) {
            console.log("❌ Staking pool not available");
            return;
        }
        
        console.log("\n📊 STAKING POOL STATISTICS:");
        console.log("=".repeat(60));
        
        try {
            const poolStats = await this.contracts.ratStakingPool.getPoolStats();
            
            console.log("💰 Pool Overview:");
            console.log(`  Total RAT Staked:       ${ethers.utils.formatEther(poolStats._totalStaked)} RAT`);
            console.log(`  Total Yield Distributed: ${ethers.utils.formatUnits(poolStats._totalYieldDistributed, 6)} USDT`);
            console.log(`  Pending Yield:          ${ethers.utils.formatUnits(poolStats._pendingYieldUSDT, 6)} USDT`);
            console.log(`  Pool USDT Balance:      ${ethers.utils.formatUnits(poolStats._poolUSDTBalance, 6)} USDT`);
            console.log(`  Current APY:            ${(poolStats._currentAPY / 100).toFixed(2)}%`);
            
            // Get additional configuration
            const minStake = await this.contracts.ratStakingPool.minStakeAmount();
            const lockPeriod = await this.contracts.ratStakingPool.unstakeLockPeriod();
            const distributionRate = await this.contracts.ratStakingPool.yieldDistributionRate();
            const fee = await this.contracts.ratStakingPool.yieldDistributionFee();
            
            console.log("\n⚙️ Configuration:");
            console.log(`  Minimum Stake:          ${ethers.utils.formatEther(minStake)} RAT`);
            console.log(`  Unstake Lock Period:    ${lockPeriod / 86400} days`);
            console.log(`  Daily Distribution Rate: ${distributionRate / 100}%`);
            console.log(`  Yield Distribution Fee: ${fee / 100}%`);
            
        } catch (error) {
            console.error("❌ Failed to load staking stats:", error.message);
        }
    }
    
    // View user staking details
    async viewUserStaking(userAddress) {
        if (!this.contracts.ratStakingPool) {
            console.log("❌ Staking pool not available");
            return;
        }
        
        console.log(`\n👤 USER STAKING DETAILS FOR ${userAddress}:`);
        console.log("=".repeat(70));
        
        try {
            const stakeInfo = await this.contracts.ratStakingPool.getUserStakeInfo(userAddress);
            const pendingRewards = await this.contracts.ratStakingPool.pendingRewards(userAddress);
            
            console.log("🏦 Staking Information:");
            console.log(`  Staked RAT:        ${ethers.utils.formatEther(stakeInfo.stakedAmount)} RAT`);
            console.log(`  Pending Rewards:   ${ethers.utils.formatUnits(pendingRewards, 6)} USDT`);
            console.log(`  Total Claimed:     ${ethers.utils.formatUnits(stakeInfo.totalClaimedUSDT, 6)} USDT`);
            console.log(`  Last Stake Time:   ${new Date(stakeInfo.lastStakeTime * 1000).toLocaleString()}`);
            console.log(`  Can Unstake:       ${stakeInfo.canUnstake ? '✅ Yes' : '❌ No'}`);
            
            // Also show custody balance from PledgeManager
            const custodyBalance = await this.contracts.pledgeManager.getUserRATBalance(userAddress);
            console.log(`  Custody Balance:   ${ethers.utils.formatEther(custodyBalance)} RAT`);
            
            const totalRAT = stakeInfo.stakedAmount.add(custodyBalance);
            console.log(`  Total RAT:         ${ethers.utils.formatEther(totalRAT)} RAT`);
            
        } catch (error) {
            console.error("❌ Failed to load user staking details:", error.message);
        }
    }
    
    // Stake RAT from custody for user
    async stakeForUser(userAddress, amount) {
        if (!this.contracts.ratStakingPool) {
            console.log("❌ Staking pool not available");
            return;
        }
        
        console.log(`\n🏦 STAKING ${amount} RAT FOR USER ${userAddress}:`);
        
        try {
            // Check user's custody balance
            const custodyBalance = await this.contracts.pledgeManager.getUserRATBalance(userAddress);
            const amountWei = ethers.utils.parseEther(amount.toString());
            
            console.log(`User's Custody Balance: ${ethers.utils.formatEther(custodyBalance)} RAT`);
            
            if (custodyBalance.lt(amountWei)) {
                console.error("❌ User has insufficient RAT in custody");
                return;
            }
            
            const tx = await this.contracts.ratStakingPool.adminStakeForUser(
                userAddress, 
                amountWei
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log("✅ Successfully staked RAT for user!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Show updated balances
            await this.viewUserStaking(userAddress);
            
        } catch (error) {
            console.error("❌ Staking failed:", error.message);
        }
    }
    
    // Distribute yield manually
    async distributeYield() {
        if (!this.contracts.ratStakingPool) {
            console.log("❌ Staking pool not available");
            return;
        }
        
        console.log("\n💧 DISTRIBUTING YIELD:");
        
        try {
            const poolStats = await this.contracts.ratStakingPool.getPoolStats();
            console.log(`Pending Yield: ${ethers.utils.formatUnits(poolStats._pendingYieldUSDT, 6)} USDT`);
            
            if (poolStats._pendingYieldUSDT.eq(0)) {
                console.log("⚠️ No pending yield to distribute");
                return;
            }
            
            const tx = await this.contracts.ratStakingPool.distributeYield();
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✅ Yield distributed successfully!");
            
            // Show updated stats
            await this.viewStakingStats();
            
        } catch (error) {
            console.error("❌ Yield distribution failed:", error.message);
        }
    }
    
    // Provide yield from liquidity aggregator
    async provideYieldFromAggregator(usdtAmount) {
        console.log(`\n🔄 PROVIDING ${usdtAmount} USDT YIELD FROM AGGREGATOR:`);
        
        try {
            const aggregatorStats = await this.contracts.liquidityAggregator.getAggregatorStats();
            console.log(`Aggregator USDT Balance: ${ethers.utils.formatUnits(aggregatorStats._currentUSDTBalance, 6)} USDT`);
            
            const usdtWei = ethers.utils.parseUnits(usdtAmount.toString(), 6);
            
            if (aggregatorStats._currentUSDTBalance.lt(usdtWei)) {
                console.error("❌ Insufficient USDT in aggregator");
                return;
            }
            
            const tx = await this.contracts.liquidityAggregator.provideYieldToPool(usdtWei);
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            await tx.wait();
            console.log("✅ Yield provided from aggregator successfully!");
            
            // Show updated stats
            await this.viewStakingStats();
            
        } catch (error) {
            console.error("❌ Failed to provide yield from aggregator:", error.message);
        }
    }
    
    // Configure staking pool settings
    async configureStaking(setting, value) {
        if (!this.contracts.ratStakingPool) {
            console.log("❌ Staking pool not available");
            return;
        }
        
        console.log(`\n⚙️ CONFIGURING STAKING: ${setting} = ${value}`);
        
        try {
            let tx;
            
            switch (setting) {
                case 'distributionRate':
                    tx = await this.contracts.ratStakingPool.setYieldDistributionRate(value);
                    break;
                case 'distributionFee':
                    tx = await this.contracts.ratStakingPool.setYieldDistributionFee(value);
                    break;
                case 'minStake':
                    tx = await this.contracts.ratStakingPool.setMinStakeAmount(
                        ethers.utils.parseEther(value.toString())
                    );
                    break;
                case 'lockPeriod':
                    tx = await this.contracts.ratStakingPool.setUnstakeLockPeriod(value * 86400); // Convert days to seconds
                    break;
                case 'autoStake':
                    const [enabled, percentage] = value.split(',');
                    tx = await this.contracts.pledgeManager.setAutoStakeConfig(
                        enabled === 'true', 
                        parseInt(percentage)
                    );
                    break;
                case 'autoYield':
                    const [yieldEnabled, yieldPercentage] = value.split(',');
                    tx = await this.contracts.liquidityAggregator.setAutoYieldConfig(
                        yieldEnabled === 'true', 
                        parseInt(yieldPercentage)
                    );
                    break;
                default:
                    console.error("❌ Unknown setting");
                    return;
            }
            
            console.log("Transaction hash:", tx.hash);
            await tx.wait();
            console.log("✅ Setting updated successfully!");
            
        } catch (error) {
            console.error("❌ Failed to update setting:", error.message);
        }
    }
    
    // Enhanced system stats including staking
    async viewEnhancedSystemStats() {
        console.log("\n📊 ENHANCED SYSTEM STATISTICS:");
        console.log("=".repeat(80));
        
        try {
            // RAT Token stats
            const totalSupply = await this.contracts.ratToken.totalSupply();
            const maxSupply = await this.contracts.ratToken.MAX_SUPPLY();
            
            console.log("🪙 RAT Token:");
            console.log(`  Total Supply:    ${ethers.utils.formatEther(totalSupply)}`);
            console.log(`  Max Supply:      ${ethers.utils.formatEther(maxSupply)}`);
            console.log(`  Utilization:     ${(totalSupply * 100 / maxSupply).toFixed(2)}%`);
            
            // Pledge Manager stats
            const totalRATInCustody = await this.contracts.pledgeManager.totalRATInCustody();
            const nextPledgeId = await this.contracts.pledgeManager.nextPledgeId();
            
            console.log("\n📋 Pledge Manager:");
            console.log(`  Total RAT in Custody: ${ethers.utils.formatEther(totalRATInCustody)}`);
            console.log(`  Total Pledges:        ${nextPledgeId.sub(1)}`);
            
            // Staking Pool stats
            if (this.contracts.ratStakingPool) {
                const poolStats = await this.contracts.ratStakingPool.getPoolStats();
                
                console.log("\n🏦 Staking Pool:");
                console.log(`  Total Staked:         ${ethers.utils.formatEther(poolStats._totalStaked)} RAT`);
                console.log(`  Total Yield Paid:     ${ethers.utils.formatUnits(poolStats._totalYieldDistributed, 6)} USDT`);
                console.log(`  Pending Yield:        ${ethers.utils.formatUnits(poolStats._pendingYieldUSDT, 6)} USDT`);
                console.log(`  Current APY:          ${(poolStats._currentAPY / 100).toFixed(2)}%`);
                
                // Calculate staking ratio
                const totalRAT = totalSupply.gt(0) ? totalSupply : ethers.constants.One;
                const stakingRatio = poolStats._totalStaked.mul(10000).div(totalRAT);
                console.log(`  Staking Ratio:        ${stakingRatio.toNumber() / 100}%`);
            }
            
            // Liquidity Aggregator stats
            const aggregatorStats = await this.contracts.liquidityAggregator.getAggregatorStats();
            
            console.log("\n💧 Liquidity Aggregator:");
            console.log(`  Total USDT Aggregated: ${ethers.utils.formatUnits(aggregatorStats._totalUSDTAggregated, 6)} USDT`);
            console.log(`  Total Yield Provided:  ${ethers.utils.formatUnits(aggregatorStats._totalYieldProvided, 6)} USDT`);
            console.log(`  Current USDT Balance:  ${ethers.utils.formatUnits(aggregatorStats._currentUSDTBalance, 6)} USDT`);
            console.log(`  Auto Yield:            ${aggregatorStats._autoYieldEnabled ? 'Enabled' : 'Disabled'} (${aggregatorStats._yieldPercentage / 100}%)`);
            
            // ETH balance in aggregator
            const ethBalance = await ethers.provider.getBalance(this.contracts.liquidityAggregator.address);
            console.log(`  ETH Balance:          ${ethers.utils.formatEther(ethBalance)} ETH`);
            
        } catch (error) {
            console.error("❌ Failed to load enhanced stats:", error.message);
        }
    }
    
    // Original methods from previous admin operations (abbreviated)
    async viewPendingPledges() {
        console.log("\n📋 PENDING PLEDGES:");
        console.log("=".repeat(80));
        
        for (let i = 1; i <= 20; i++) {
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
                break;
            }
        }
    }
    
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
            console.log("✅ Asset approved successfully!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Get the pledge details to show RAT tokens issued
            const pledge = await this.contracts.pledgeManager.pledges(pledgeId);
            console.log(`RAT Tokens Issued: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
            
            if (pledge.autoStaked) {
                console.log("🏦 RAT tokens were automatically staked for the user");
            }
            
        } catch (error) {
            console.error("❌ Approval failed:", error.message);
        }
    }
}

// Command-line interface
async function main() {
    const admin = new AdminStakingOperations();
    await admin.init();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'pending':
            await admin.viewPendingPledges();
            break;
            
        case 'approve':
            if (args.length < 3) {
                console.log("Usage: node admin-staking-operations.js approve <pledgeId> <approvedValue>");
                return;
            }
            await admin.approveAsset(parseInt(args[1]), parseFloat(args[2]));
            break;
            
        case 'stakingstats':
            await admin.viewStakingStats();
            break;
            
        case 'userstaking':
            if (args.length < 2) {
                console.log("Usage: node admin-staking-operations.js userstaking <userAddress>");
                return;
            }
            await admin.viewUserStaking(args[1]);
            break;
            
        case 'stake':
            if (args.length < 3) {
                console.log("Usage: node admin-staking-operations.js stake <userAddress> <amount>");
                return;
            }
            await admin.stakeForUser(args[1], parseFloat(args[2]));
            break;
            
        case 'distribute':
            await admin.distributeYield();
            break;
            
        case 'provideyield':
            if (args.length < 2) {
                console.log("Usage: node admin-staking-operations.js provideyield <usdtAmount>");
                return;
            }
            await admin.provideYieldFromAggregator(parseFloat(args[1]));
            break;
            
        case 'config':
            if (args.length < 3) {
                console.log("Usage: node admin-staking-operations.js config <setting> <value>");
                console.log("Settings: distributionRate, distributionFee, minStake, lockPeriod");
                console.log("         autoStake (format: true,8000), autoYield (format: true,5000)");
                return;
            }
            await admin.configureStaking(args[1], args[2]);
            break;
            
        case 'stats':
            await admin.viewEnhancedSystemStats();
            break;
            
        default:
            console.log("🎯 RAT Asset Pledge System - Admin Staking Operations");
            console.log("\nAvailable commands:");
            console.log("  pending                                    - View pending pledges");
            console.log("  approve <pledgeId> <value>                - Approve asset pledge");
            console.log("  stakingstats                              - View staking pool statistics");
            console.log("  userstaking <userAddress>                 - View user staking details");
            console.log("  stake <userAddress> <amount>              - Stake RAT for user from custody");
            console.log("  distribute                                - Distribute pending yield");
            console.log("  provideyield <usdtAmount>                 - Provide yield from aggregator");
            console.log("  config <setting> <value>                  - Configure staking settings");
            console.log("  stats                                     - View enhanced system statistics");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdminStakingOperations;