export const CONTRACT_ADDRESSES = {
  RATToken: process.env.NEXT_PUBLIC_RAT_TOKEN_ADDRESS || '',
  PledgeManager: process.env.NEXT_PUBLIC_PLEDGE_MANAGER_ADDRESS || '',
  LiquidityAggregator: process.env.NEXT_PUBLIC_LIQUIDITY_AGGREGATOR_ADDRESS || '',
  RATStakingPool: process.env.NEXT_PUBLIC_RAT_STAKING_POOL_ADDRESS || '',
  PriceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS || '',
}

export const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1'),
  name: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Ethereum',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || '',
}

// ABI definitions for the contracts
export const RAT_TOKEN_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function burn(uint256 amount) external",
  "function burnFrom(address account, uint256 amount) external",
  "function MAX_SUPPLY() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]

export const PLEDGE_MANAGER_ABI = [
  "function pledgeAsset(string calldata assetDescription, uint256 estimatedValue, string calldata documentHash, address assetAddress) external",
  "function approveAsset(uint256 pledgeId, uint256 approvedValue) external",
  "function rejectAsset(uint256 pledgeId, string calldata reason) external",
  "function pledges(uint256) external view returns (address pledger, string memory assetDescription, uint256 estimatedValue, string memory documentHash, uint8 status, uint256 ratTokensIssued, uint256 pledgeTime, uint256 approvalTime, bool autoStaked, address assetAddress, uint256 marketValueAtApproval)",
  "function getUserPledges(address user) external view returns (uint256[] memory)",
  "function getUserRATBalance(address user) external view returns (uint256)",
  "function getUserTotalRAT(address user) external view returns (uint256 custodyBalance, uint256 stakedBalance, uint256 totalBalance)",
  "function nextPledgeId() external view returns (uint256)",
  "function totalRATInCustody() external view returns (uint256)",
  "function validatePledgeValue(uint256 pledgeId) external view returns (bool isValid, uint256 currentMarketValue, uint256 deviation, string memory status)",
  "function adminSwapRATForUser(address user, uint256 ratAmount, uint256 minUSDTReceived, bytes calldata swapData) external",
  "event AssetPledged(uint256 indexed pledgeId, address indexed pledger, uint256 estimatedValue, string assetDescription, address assetAddress)",
  "event AssetApproved(uint256 indexed pledgeId, uint256 ratTokensIssued, uint256 autoStakedAmount, uint256 marketValue)",
  "event AssetRejected(uint256 indexed pledgeId, string reason)"
]

export const LIQUIDITY_AGGREGATOR_ABI = [
  "function getAggregatorStats() external view returns (uint256 _totalUSDTAggregated, uint256 _totalYieldProvided, uint256 _currentUSDTBalance, uint256 _yieldPercentage, bool _autoYieldEnabled)",
  "function getBestQuote(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256 bestAmountOut, string memory bestDex)",
  "function addETHLiquidity() external payable",
  "function provideYieldToPool(uint256 usdtAmount) external",
  "function triggerLiquidityAggregation(uint256 assetValue, address pledger) external",
  "event LiquidityAggregated(address indexed pledger, uint256 assetValue, uint256 usdtAcquired, uint256 feesTaken, uint256 yieldProvided, string dexUsed)"
]

export const RAT_STAKING_POOL_ABI = [
  "function stakeRAT(uint256 amount) external",
  "function unstakeRAT(uint256 amount) external",
  "function claimRewards() external",
  "function adminStakeForUser(address user, uint256 amount) external",
  "function addYield(uint256 usdtAmount) external",
  "function getUserStakeInfo(address user) external view returns (uint256 stakedAmount, uint256 pendingUSDT, uint256 totalClaimedUSDT, uint256 lastStakeTime, bool canUnstake)",
  "function getPoolStats() external view returns (uint256 _totalStaked, uint256 _totalYieldDistributed, uint256 _pendingYieldUSDT, uint256 _currentAPY, uint256 _poolUSDTBalance)",
  "function pendingRewards(address user) external view returns (uint256)",
  "function distributeYield() external",
  "function forceDistributeAllYield() external",
  "event Staked(address indexed user, uint256 amount, uint256 totalStaked)",
  "event Unstaked(address indexed user, uint256 amount, uint256 totalStaked)",
  "event YieldClaimed(address indexed user, uint256 usdtAmount)",
  "event YieldDistributed(uint256 usdtAmount, uint256 newAccUSDTPerShare)"
]

export const PRICE_ORACLE_ABI = [
  "function getLatestPrice(address asset) external view returns (int256 price, uint256 timestamp)",
  "function getLatestPrices(address[] calldata assets) external view returns (int256[] memory prices, uint256 timestamp)",
  "function isPriceFresh(address asset) external view returns (bool fresh)",
  "function getStalenessThreshold() external view returns (uint256 threshold)",
  "function convertToUSD(address asset, uint256 amount) external view returns (uint256 usdValue)",
  "function addPriceFeed(address asset, address feed, string calldata name) external",
  "function updatePriceFeed(address asset, address newFeed) external",
  "function setStalenessThreshold(uint256 threshold) external",
  "event PriceFeedAdded(address indexed asset, address indexed feed, string name)",
  "event PriceFeedUpdated(address indexed asset, address indexed oldFeed, address indexed newFeed)"
]

// Utility functions
export const formatEther = (value: string | number) => {
  return parseFloat(value.toString()).toFixed(4)
}

export const formatUSDT = (value: string | number) => {
  return parseFloat(value.toString()).toFixed(2)
}

export const getStatusText = (status: number) => {
  const statuses = ['Pending', 'Approved', 'Rejected']
  return statuses[status] || 'Unknown'
}

export const getStatusColor = (status: number) => {
  const colors = ['warning', 'success', 'error']
  return colors[status] || 'secondary'
}