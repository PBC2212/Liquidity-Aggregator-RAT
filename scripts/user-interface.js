// user-interface.js
const { ethers } = require("hardhat");
const fs = require('fs');
const readline = require('readline');

// Load deployment info
function loadDeploymentInfo() {
    try {
        const data = fs.readFileSync('./deployment-info.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Deployment info not found! Please run deployment first.");
        process.exit(1);
    }
}

class UserInterface {
    constructor() {
        this.deploymentInfo = loadDeploymentInfo();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async init(userAddress = null) {
        const signers = await ethers.getSigners();
        
        if (userAddress) {
            // Use specific address if provided
            this.signer = await ethers.getImpersonatedSigner(userAddress);
        } else {
            // Use first available signer
            this.signer = signers[0];
        }
        
        // Load contract instances
        this.pledgeManager = await ethers.getContractAt(
            "PledgeManager", 
            this.deploymentInfo.contracts.PledgeManager,
            this.signer
        );
        
        console.log("🎯 RAT Asset Pledge System");
        console.log("User Address:", this.signer.address);
        console.log("=".repeat(50));
    }
    
    async showMainMenu() {
        console.log("\n📱 MAIN MENU:");
        console.log("1. Pledge New Asset");
        console.log("2. View My Pledges");
        console.log("3. View My RAT Balance");
        console.log("4. View Asset Pledge Details");
        console.log("5. Exit");
        
        const choice = await this.getInput("\nSelect option (1-5): ");
        
        switch (choice) {
            case '1':
                await this.pledgeAsset();
                break;
            case '2':
                await this.viewMyPledges();
                break;
            case '3':
                await this.viewMyBalance();
                break;
            case '4':
                await this.viewPledgeDetails();
                break;
            case '5':
                console.log("Goodbye!");
                this.rl.close();
                return;
            default:
                console.log("Invalid option. Please try again.");
        }
        
        await this.showMainMenu();
    }
    
    async pledgeAsset() {
        console.log("\n📝 PLEDGE NEW ASSET:");
        console.log("=".repeat(30));
        
        try {
            const description = await this.getInput("Asset Description: ");
            const valueStr = await this.getInput("Estimated Value (USD): ");
            const documentHash = await this.getInput("Document Hash (IPFS/URL): ");
            
            const value = parseFloat(valueStr);
            if (isNaN(value) || value <= 0) {
                console.log("❌ Invalid value. Please enter a positive number.");
                return;
            }
            
            console.log("\n📋 Pledge Summary:");
            console.log(`Description: ${description}`);
            console.log(`Value: $${value}`);
            console.log(`Document: ${documentHash}`);
            
            const confirm = await this.getInput("\nConfirm pledge? (y/n): ");
            if (confirm.toLowerCase() !== 'y') {
                console.log("Pledge cancelled.");
                return;
            }
            
            console.log("\n⏳ Submitting pledge...");
            
            const tx = await this.pledgeManager.pledgeAsset(
                description,
                ethers.utils.parseEther(value.toString()),
                documentHash
            );
            
            console.log("Transaction hash:", tx.hash);
            console.log("Waiting for confirmation...");
            
            const receipt = await tx.wait();
            
            // Extract pledge ID from events
            const pledgeEvent = receipt.events?.find(e => e.event === 'AssetPledged');
            const pledgeId = pledgeEvent?.args?.pledgeId?.toString();
            
            console.log("✅ Asset pledged successfully!");
            console.log(`Pledge ID: ${pledgeId}`);
            console.log("Status: Pending Admin Approval");
            
        } catch (error) {
            console.error("❌ Pledge failed:", error.message);
        }
    }
    
    async viewMyPledges() {
        console.log("\n📊 MY PLEDGES:");
        console.log("=".repeat(40));
        
        try {
            const pledgeIds = await this.pledgeManager.getUserPledges(this.signer.address);
            
            if (pledgeIds.length === 0) {
                console.log("No pledges found.");
                return;
            }
            
            for (let i = 0; i < pledgeIds.length; i++) {
                const pledgeId = pledgeIds[i];
                const pledge = await this.pledgeManager.pledges(pledgeId);
                
                const statusText = ["🟡 Pending", "✅ Approved", "❌ Rejected"][pledge.status];
                
                console.log(`\nPledge #${pledgeId}:`);
                console.log(`  Status: ${statusText}`);
                console.log(`  Asset: ${pledge.assetDescription}`);
                console.log(`  Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
                console.log(`  Document: ${pledge.documentHash}`);
                console.log(`  Pledge Date: ${new Date(pledge.pledgeTime * 1000).toLocaleDateString()}`);
                
                if (pledge.status === 1) { // Approved
                    console.log(`  RAT Tokens: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
                    console.log(`  Approval Date: ${new Date(pledge.approvalTime * 1000).toLocaleDateString()}`);
                }
            }
            
        } catch (error) {
            console.error("❌ Failed to load pledges:", error.message);
        }
    }
    
    async viewMyBalance() {
        console.log("\n💰 MY RAT BALANCE:");
        console.log("=".repeat(30));
        
        try {
            const balance = await this.pledgeManager.getUserRATBalance(this.signer.address);
            const balanceFormatted = ethers.utils.formatEther(balance);
            
            console.log(`RAT Tokens in Custody: ${balanceFormatted} RAT`);
            console.log(`Estimated USD Value: $${balanceFormatted}`); // 1:1 ratio
            
            if (parseFloat(balanceFormatted) > 0) {
                console.log("\n📝 Note: Your RAT tokens are held in custody.");
                console.log("Only the admin can execute swaps on your behalf.");
                console.log("Contact admin to request USDT swaps.");
            }
            
        } catch (error) {
            console.error("❌ Failed to load balance:", error.message);
        }
    }
    
    async viewPledgeDetails() {
        console.log("\n🔍 PLEDGE DETAILS:");
        console.log("=".repeat(25));
        
        try {
            const pledgeIdStr = await this.getInput("Enter Pledge ID: ");
            const pledgeId = parseInt(pledgeIdStr);
            
            if (isNaN(pledgeId) || pledgeId <= 0) {
                console.log("❌ Invalid Pledge ID");
                return;
            }
            
            const pledge = await this.pledgeManager.pledges(pledgeId);
            
            if (pledge.pledger === ethers.constants.AddressZero) {
                console.log("❌ Pledge not found");
                return;
            }
            
            const statusText = ["🟡 Pending", "✅ Approved", "❌ Rejected"][pledge.status];
            
            console.log(`\nPledge #${pledgeId} Details:`);
            console.log(`Pledger: ${pledge.pledger}`);
            console.log(`Status: ${statusText}`);
            console.log(`Asset: ${pledge.assetDescription}`);
            console.log(`Estimated Value: $${ethers.utils.formatEther(pledge.estimatedValue)}`);
            console.log(`Document: ${pledge.documentHash}`);
            console.log(`Pledge Date: ${new Date(pledge.pledgeTime * 1000).toLocaleString()}`);
            
            if (pledge.status === 1) { // Approved
                console.log(`RAT Tokens Issued: ${ethers.utils.formatEther(pledge.ratTokensIssued)}`);
                console.log(`Approval Date: ${new Date(pledge.approvalTime * 1000).toLocaleString()}`);
            }
            
        } catch (error) {
            console.error("❌ Failed to load pledge details:", error.message);
        }
    }
    
    getInput(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
}

// Standalone functions for direct script usage
async function pledgeAssetDirect(description, value, documentHash) {
    const ui = new UserInterface();
    await ui.init();
    
    console.log("📝 Pledging Asset...");
    
    try {
        const tx = await ui.pledgeManager.pledgeAsset(
            description,
            ethers.utils.parseEther(value.toString()),
            documentHash
        );
        
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        
        const pledgeEvent = receipt.events?.find(e => e.event === 'AssetPledged');
        const pledgeId = pledgeEvent?.args?.pledgeId?.toString();
        
        console.log("✅ Asset pledged successfully!");
        console.log(`Pledge ID: ${pledgeId}`);
        
        return pledgeId;
        
    } catch (error) {
        console.error("❌ Pledge failed:", error.message);
        throw error;
    }
}

async function viewUserBalanceDirect(userAddress) {
    const ui = new UserInterface();
    await ui.init();
    
    try {
        const balance = await ui.pledgeManager.getUserRATBalance(userAddress);
        const balanceFormatted = ethers.utils.formatEther(balance);
        
        console.log(`RAT Balance for ${userAddress}: ${balanceFormatted} RAT`);
        return balanceFormatted;
        
    } catch (error) {
        console.error("❌ Failed to load balance:", error.message);
        throw error;
    }
}

// Command-line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'pledge' && args.length >= 4) {
        // Direct pledge: node user-interface.js pledge "description" value "documentHash"
        await pledgeAssetDirect(args[1], parseFloat(args[2]), args[3]);
        return;
    }
    
    if (command === 'balance' && args.length >= 2) {
        // Check balance: node user-interface.js balance userAddress
        await viewUserBalanceDirect(args[1]);
        return;
    }
    
    // Interactive mode
    const ui = new UserInterface();
    await ui.init(args[0]); // Optional user address
    await ui.showMainMenu();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { UserInterface, pledgeAssetDirect, viewUserBalanceDirect };