const { getContract, getAdminSigner } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  if (req.method === 'GET') {
    return res.json(await withErrorHandling(async () => {
      const ratStakingPool = getContract('RATStakingPool');
      const poolStats = await ratStakingPool.getPoolStats();
      
      return {
        totalStaked: ethers.utils.formatEther(poolStats[0]),
        totalYieldDistributed: ethers.utils.formatUnits(poolStats[1], 6),
        pendingYield: ethers.utils.formatUnits(poolStats[2], 6),
        currentAPY: poolStats[3].toNumber() / 100,
        poolUSDTBalance: ethers.utils.formatUnits(poolStats[4], 6)
      };
    }));
  }
  
  if (req.method === 'POST') {
    return res.json(await withErrorHandling(async () => {
      const { action, userAddress, amount } = req.body;
      const adminSigner = getAdminSigner();
      const ratStakingPool = getContract('RATStakingPool', adminSigner);
      
      let tx;
      
      switch (action) {
        case 'stake_for_user':
          tx = await ratStakingPool.adminStakeForUser(
            userAddress,
            ethers.utils.parseEther(amount.toString())
          );
          break;
          
        case 'distribute_yield':
          tx = await ratStakingPool.distributeYield();
          break;
          
        case 'provide_yield':
          const liquidityAggregator = getContract('LiquidityAggregator', adminSigner);
          tx = await liquidityAggregator.provideYieldToPool(
            ethers.utils.parseUnits(amount.toString(), 6)
          );
          break;
          
        default:
          throw new Error('Invalid action');
      }
      
      const receipt = await tx.wait();
      
      return {
        action,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      };
    }));
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};