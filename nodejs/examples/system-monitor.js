// System monitoring script for RAT Protocol
const { RATProtocolManager } = require('../rat-protocol-manager');

class SystemMonitor {
    constructor(network = 'ethereum') {
        this.ratProtocol = new RATProtocolManager(network);
        this.network = network;
    }
    
    async initialize() {
        console.log(`🔧 Initializing system monitor for ${this.network}...`);
        await this.ratProtocol.initializeContracts();
        console.log("✅ Monitor initialized");
    }
    
    async generateReport() {
        console.log(`\n📋 SYSTEM HEALTH REPORT - ${new Date().toLocaleString()}`);
        console.log("=".repeat(60));
        
        try {
            // Get system stats
            const stats = await this.ratProtocol.getSystemStats();
            const pending = await this.ratProtocol.getPendingPledges();
            
            // Health checks
            const alerts = [];
            const usdtBalance = parseFloat(stats.liquidityAggregator?.currentUSDTBalance || "0");
            const ratUtilization = parseFloat(stats.ratToken?.utilization || "0");
            
            if (usdtBalance < 10000) {
                alerts.push("🚨 LOW USDT LIQUIDITY");
            }
            if (pending.length > 5) {
                alerts.push("🚨 HIGH PENDING PLEDGES");
            }
            if (ratUtilization > 85) {
                alerts.push("🚨 HIGH RAT UTILIZATION");
            }
            
            console.log(`\n🌐 Network: ${this.network.toUpperCase()}`);
            console.log(`📊 Status: ${alerts.length === 0 ? '✅ HEALTHY' : '⚠️ ALERTS ACTIVE'}`);
            
            if (alerts.length > 0) {
                console.log(`\n🚨 ALERTS:`);
                alerts.forEach(alert => console.log(`   ${alert}`));
            }
            
            console.log(`\n📈 Metrics:`);
            console.log(`   RAT Supply: ${stats.ratToken?.totalSupply || 'N/A'} (${stats.ratToken?.utilization || 'N/A'}%)`);
            console.log(`   USDT Pool: $${stats.liquidityAggregator?.currentUSDTBalance || 'N/A'}`);
            console.log(`   Pending Pledges: ${pending.length}`);
            console.log(`   Total RAT in Custody: ${stats.pledgeManager?.totalRATInCustody || 'N/A'}`);
            
            return {
                network: this.network,
                healthy: alerts.length === 0,
                alerts,
                stats,
                pendingCount: pending.length,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error("❌ Failed to generate report:", error.message);
            return { error: error.message };
        }
    }
    
    async startMonitoring(intervalMinutes = 5) {
        console.log(`📊 Starting continuous monitoring (every ${intervalMinutes} minutes)`);
        
        // Generate initial report
        await this.generateReport();
        
        // Set up interval
        setInterval(async () => {
            try {
                await this.generateReport();
            } catch (error) {
                console.error("❌ Monitoring error:", error.message);
            }
        }, intervalMinutes * 60 * 1000);
    }
}

async function main() {
    const monitor = new SystemMonitor('ethereum'); // Change network as needed
    await monitor.initialize();
    
    // Generate one report
    await monitor.generateReport();
    
    // Uncomment to start continuous monitoring
    // await monitor.startMonitoring(5);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SystemMonitor;