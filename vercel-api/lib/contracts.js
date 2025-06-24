const { ethers } = require('ethers');

const CONTRACT_ADDRESSES = {
  RATToken: process.env.RAT_TOKEN_ADDRESS,
  PledgeManager: process.env.PLEDGE_MANAGER_ADDRESS,
  LiquidityAggregator: process.env.LIQUIDITY_AGGREGATOR_ADDRESS,
  RATStakingPool: process.env.RAT_STAKING_POOL_ADDRESS
};

const ABIS = {
  RATToken: [
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function mint(address to, uint256 amount)",
    "function burn(uint256 amount)"
  ],
  
  PledgeManager: [
    "function pledgeAsset(string memory assetDescription, uint256 estimatedValue, string memory documentHash, address assetAddress)",
    "function approveAsset(uint256 pledgeId, uint256 approvedValue)",
    "function rejectAsset(uint256 pledgeId, string memory reason)",
    "function pledges(uint256) view returns (tuple(address pledger, string assetDescription, uint256 estimatedValue, string documentHash, uint8 status, uint256 ratTokensIssued, uint256 pledgeTime, uint256 approvalTime, bool autoStaked, address assetAddress, uint256 marketValueAtApproval))",
    "function getUserPledges(address user) view returns (uint256[])",
    "function getUserRATBalance(address user) view returns (uint256)",
    "function getUserTotalRAT(address user) view returns (uint256, uint256, uint256)",
    "function totalRATInCustody() view returns (uint256)",
    "function nextPledgeId() view returns (uint256)"
  ],
  
  LiquidityAggregator: [
    "function triggerLiquidityAggregation(uint256 assetValue, address pledger)",
    "function getAggregatorStats() view returns (uint256, uint256, uint256, uint256, bool)",
    "function getBestQuote(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256, string)",
    "function addETHLiquidity() payable",
    "function provideYieldToPool(uint256 usdtAmount)"
  ],
  
  RATStakingPool: [
    "function getPoolStats() view returns (uint256, uint256, uint256, uint256, uint256)",
    "function getUserStakeInfo(address user) view returns (uint256, uint256, uint256, uint256, bool)",
    "function adminStakeForUser(address user, uint256 amount)",
    "function addYield(uint256 usdtAmount)",
    "function distributeYield()"
  ]
};

function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
}

function getAdminSigner() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

function getContract(contractName, signer = null) {
  const provider = signer || getProvider();
  return new ethers.Contract(
    CONTRACT_ADDRESSES[contractName],
    ABIS[contractName],
    provider
  );
}

module.exports = {
  CONTRACT_ADDRESSES,
  ABIS,
  getProvider,
  getAdminSigner,
  getContract
};