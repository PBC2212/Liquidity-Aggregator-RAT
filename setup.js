// setup.js
const fs = require('fs');
const path = require('path');

console.log("🚀 RAT Asset Pledge System Setup");
console.log("=".repeat(40));

// Create project structure
const directories = [
    'contracts',
    'scripts', 
    'test',
    'artifacts',
    'cache'
];

console.log("📁 Creating project directories...");
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✓ Created ${dir}/`);
    }
});

// Create .env template
console.log("\n📝 Creating environment template...");
const envTemplate = `# RAT Asset Pledge System Environment Variables
# Copy this file to .env and fill in your values

# Private key for deployments (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY
GOERLI_RPC_URL=https://eth-goerli.alchemyapi.io/v2/YOUR_ALCHEMY_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.alchemyapi.io/v2/YOUR_ALCHEMY_KEY
POLYGON_RPC_URL=https://polygon-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.alchemyapi.io/v2/YOUR_ALCHEMY_KEY
BSC_RPC_URL=https://bsc-dataseed1.binance.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# API Keys for verification
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISM_API_KEY=your_optimism_api_key

# Gas reporting
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Network Configuration
DEFAULT_NETWORK=hardhat
`;

fs.writeFileSync('.env.example', envTemplate);
console.log("✓ Created .env.example");

if (!fs.existsSync('.env')) {
    fs.writeFileSync('.env', envTemplate);
    console.log("✓ Created .env (please fill in your values)");
}

// Create gitignore
console.log("\n📝 Creating .gitignore...");
const gitignore = `# Dependencies
node_modules/
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.production

# Build outputs
artifacts/
cache/
coverage/
coverage.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Hardhat
typechain/
typechain-types/

# Deployment
deployment-info.json
deployments/
`;

fs.writeFileSync('.gitignore', gitignore);
console.log("✓ Created .gitignore");

// Create README
console.log("\n📖 Creating README...");
const readme = `# RAT Asset Pledge System

A decentralized system for pledging real-world assets and receiving RAT tokens with automated liquidity aggregation.

## Features

- 🏠 **Asset Pledging**: Users can pledge real-world assets for verification
- 🪙 **RAT Token Minting**: Approved assets generate RAT tokens held in custody
- 💧 **Liquidity Aggregation**: Automatic USDT sourcing from multiple DEXs
- 🔄 **Admin-Controlled Swaps**: Only admin can execute swaps on behalf of users
- 🔗 **Multi-DEX Integration**: Uniswap, SushiSwap, PancakeSwap support

## Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your keys and RPC URLs
   \`\`\`

3. **Compile Contracts**
   \`\`\`bash
   npm run compile
   \`\`\`

4. **Deploy to Local Network**
   \`\`\`bash
   npx hardhat node
   # In another terminal:
   npm run deploy
   \`\`\`

5. **Deploy to Testnet**
   \`\`\`bash
   npm run deploy:testnet
   \`\`\`

## Usage

### Admin Operations
\`\`\`bash
# View pending pledges
npm run admin pending

# Approve a pledge
npm run admin approve 1 1000

# Reject a pledge  
npm run admin reject 1 "Insufficient documentation"

# Execute swap for user
npm run admin swap 0x123... 100 95

# View system stats
npm run admin stats
\`\`\`

### User Interface
\`\`\`bash
# Interactive mode
npm run user

# Direct pledge
npm run user pledge "Real Estate Property" 50000 "QmHash123"

# Check balance
npm run user balance 0x123...
\`\`\`

## License

MIT License
`;

fs.writeFileSync('README.md', readme);
console.log("✓ Created README.md");

console.log("\n🎉 Setup complete!");
console.log("\nNext steps:");
console.log("1. Copy contract code to contracts/ folder");
console.log("2. Copy script code to scripts/ folder");
console.log("3. Fill in .env file with your keys and RPC URLs");
console.log("4. Run 'npm install' to install dependencies");
console.log("5. Run 'npm run compile' to compile contracts");
console.log("6. Run 'npm run deploy' to deploy to local network");