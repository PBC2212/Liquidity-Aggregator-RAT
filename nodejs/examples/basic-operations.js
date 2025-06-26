// Basic operations examples for RAT Protocol
const { RATProtocolManager } = require('../rat-protocol-manager');

async function runBasicOperations() {
    console.log("🚀 RAT Protocol - Basic Operations Example");
    console.log("==========================================");
    
    try {
        // Initialize (change network as needed)
        const ratProtocol = new RATProtocolManager('ethereum');
        await ratProtocol.initializeContracts();
        
        console.log("\n1️⃣ CHECKING SYSTEM STATUS:");
        await ratProtocol.getSystemStats();
        
        console.log("\n2️⃣ VIEWING PENDING PLEDGES:");
        const pending = await ratProtocol.getPendingPledges();
        
        if (pending.length > 0) {
            console.log(`\n3️⃣ PROCESSING FIRST PENDING PLEDGE:`);
            const firstPledge = pending[0];
            
            // Auto-approve if value is reasonable
            if (parseFloat(firstPledge.estimatedValue) <= 50000) {
                console.log(`🤖 Auto-approving pledge ${firstPledge.id}`);
                const approvedValue = parseFloat(firstPledge.estimatedValue) * 0.95; // 5% haircut
                
                const approval = await ratProtocol.approveAssetAndMintRAT(
                    firstPledge.id, 
                    approvedValue
                );
                
                if (approval.success) {
                    console.log(`✅ Approved! RAT issued: ${approval.ratTokensIssued}`);
                }
            } else {
                console.log(`⏭️ Skipping large pledge (requires manual review)`);
            }
        } else {
            console.log("📝 Creating a test pledge...");
            
            const pledge = await ratProtocol.submitAssetPledge(
                "Test Asset - Example Property",
                25000,
                "QmExampleDocumentHash123"
            );
            
            if (pledge.success) {
                console.log(`✅ Test pledge created with ID: ${pledge.pledgeId}`);
                
                // Wait a moment then approve it
                console.log("⏳ Waiting 5 seconds before approval...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const approval = await ratProtocol.approveAssetAndMintRAT(pledge.pledgeId, 23750);
                if (approval.success) {
                    console.log(`✅ Test pledge approved! RAT issued: ${approval.ratTokensIssued}`);
                }
            }
        }
        
        console.log("\n🎉 Basic operations completed successfully!");
        
    } catch (error) {
        console.error("❌ Basic operations failed:", error.message);
    }
}

// Run if called directly
if (require.main === module) {
    runBasicOperations().catch(console.error);
}

module.exports = { runBasicOperations };