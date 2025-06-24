RAT Asset Pledge System - Vercel API
This is the serverless API backend for the RAT Asset Pledge System. It provides endpoints to interact with your smart contracts deployed on Ethereum mainnet.
Quick Setup
1. Deploy Your Smart Contracts First
bash# In your main project directory
npx hardhat run scripts/deploy-with-staking.js --network mainnet
2. Create New Vercel Project
bashmkdir rat-vercel-api
cd rat-vercel-api
3. Copy All Files
Copy all the numbered files above into your project:

Files 1-2: Root directory files
File 3-4: Create lib/ folder and put these files there
Files 5-13: Create api/ folder structure and put these files there

4. Install Vercel CLI
bashnpm install -g vercel
5. Configure Environment Variables
In Vercel dashboard, add these environment variables:

PRIVATE_KEY - Your admin wallet private key (without 0x)
ETHEREUM_RPC_URL - Your Alchemy/Infura RPC URL
RAT_TOKEN_ADDRESS - Address from your deployment
PLEDGE_MANAGER_ADDRESS - Address from your deployment
LIQUIDITY_AGGREGATOR_ADDRESS - Address from your deployment
RAT_STAKING_POOL_ADDRESS - Address from your deployment

6. Deploy to Vercel
bashvercel --prod
API Endpoints
Once deployed, you'll have these endpoints:
System Management

GET /api/system/stats - Get system statistics
GET /api/monitoring/health - Health check

Pledge Management

GET /api/pledges/pending - List pending pledges
POST /api/admin/approve-pledge - Approve a pledge
POST /api/admin/reject-pledge - Reject a pledge

User Management

GET /api/users/[address]/balance - Get user RAT balance

Liquidity & Staking

POST /api/liquidity/trigger - Trigger liquidity aggregation
GET /api/staking/manage - Get staking stats
POST /api/staking/manage - Execute staking operations

Automation

GET /api/automation/process-pledges - Auto-process pending pledges

Usage Examples
Approve a Pledge
bashcurl -X POST https://your-app.vercel.app/api/admin/approve-pledge \
  -H "Content-Type: application/json" \
  -d '{"pledgeId": 1, "approvedValue": 50000}'
Check System Stats
bashcurl https://your-app.vercel.app/api/system/stats
Check User Balance
bashcurl https://your-app.vercel.app/api/users/0x123.../balance
Business Logic Automation
The API automatically handles:

✅ Pledge approval with criteria checking
✅ Liquidity aggregation triggering
✅ RAT token minting and custody
✅ Auto-staking for approved pledges
✅ Yield distribution to stakers
✅ Multi-DEX liquidity sourcing

File Structure
rat-vercel-api/
├── vercel.json                     # Vercel configuration
├── package.json                    # Dependencies
├── README.md                       # This file
├── lib/
│   ├── contracts.js               # Contract setup
│   └── utils.js                   # Utility functions
└── api/
    ├── system/
    │   └── stats.js               # System statistics
    ├── pledges/
    │   └── pending.js             # Pending pledges
    ├── admin/
    │   ├── approve-pledge.js      # Approve pledges
    │   └── reject-pledge.js       # Reject pledges
    ├── users/
    │   └── [address]/
    │       └── balance.js         # User balance
    ├── liquidity/
    │   └── trigger.js             # Liquidity aggregation
    ├── staking/
    │   └── manage.js              # Staking management
    ├── monitoring/
    │   └── health.js              # Health check
    └── automation/
        └── process-pledges.js     # Auto-processing
Security Notes

Your private key is encrypted in Vercel environment variables
All API calls are logged for monitoring
CORS is enabled for frontend integration
Rate limiting is handled by Vercel automatically

Support
For issues with the API, check:

Vercel deployment logs
Environment variables are set correctly
Smart contracts are deployed and verified
RPC URL is working properly

Your RAT Asset Pledge System is now ready for production use!