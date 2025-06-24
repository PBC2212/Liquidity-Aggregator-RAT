const { getContract } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  return res.json(await withErrorHandling(async () => {
    const ratToken = getContract('RATToken');
    const pledgeManager = getContract('PledgeManager');
    const liquidityAggregator = getContract('LiquidityAggregator');
    const ratStakingPool = getContract('RATStakingPool');
    
    const [
      totalSupply,
      maxSupply,
      totalRATInCustody,
      nextPledgeId,
      aggregatorStats,
      poolStats
    ] = await Promise.all([
      ratToken.totalSupply(),
      ratToken.MAX_SUPPLY(),
      pledgeManager.totalRATInCustody(),
      pledgeManager.nextPledgeId(),
      liquidityAggregator.getAggregatorStats(),
      ratStakingPool.getPoolStats()
    ]);
    
    return {
      ratToken: {
        totalSupply: ethers.utils.formatEther(totalSupply),
        maxSupply: ethers.utils.formatEther(maxSupply),
        utilization: parseFloat(ethers.utils.formatEther(totalSupply)) / parseFloat(ethers.utils.formatEther(maxSupply)) * 100
      },
      pledgeManager: {
        totalRATInCustody: ethers.utils.formatEther(totalRATInCustody),
        totalPledges: nextPledgeId.sub(1).toString()
      },
      liquidityAggregator: {
        totalUSDTAggregated: ethers.utils.formatUnits(aggregatorStats[0], 6),
        totalYieldProvided: ethers.utils.formatUnits(aggregatorStats[1], 6),
        currentUSDTBalance: ethers.utils.formatUnits(aggregatorStats[2], 6),
        autoYieldEnabled: aggregatorStats[4]
      },
      stakingPool: {
        totalStaked: ethers.utils.formatEther(poolStats[0]),
        totalYieldDistributed: ethers.utils.formatUnits(poolStats[1], 6),
        pendingYield: ethers.utils.formatUnits(poolStats[2], 6),
        currentAPY: poolStats[3].toNumber() / 100
      }
    };
  }));
};