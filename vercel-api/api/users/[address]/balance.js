const { getContract } = require('../../../lib/contracts');
const { withErrorHandling, cors } = require('../../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  return res.json(await withErrorHandling(async () => {
    const { address } = req.query;
    
    if (!address || !ethers.utils.isAddress(address)) {
      throw new Error('Invalid address parameter');
    }
    
    const pledgeManager = getContract('PledgeManager');
    const ratStakingPool = getContract('RATStakingPool');
    
    const [custodyBalance, stakedBalance, totalBalance] = await pledgeManager.getUserTotalRAT(address);
    const userPledges = await pledgeManager.getUserPledges(address);
    
    let stakingInfo = null;
    try {
      stakingInfo = await ratStakingPool.getUserStakeInfo(address);
    } catch (error) {
      // Staking pool might not be available
    }
    
    return {
      address,
      ratBalances: {
        custody: ethers.utils.formatEther(custodyBalance),
        staked: ethers.utils.formatEther(stakedBalance),
        total: ethers.utils.formatEther(totalBalance)
      },
      pledgeCount: userPledges.length,
      pledgeIds: userPledges.map(id => id.toString()),
      stakingInfo: stakingInfo ? {
        pendingRewards: ethers.utils.formatUnits(stakingInfo.pendingUSDT, 6),
        totalClaimed: ethers.utils.formatUnits(stakingInfo.totalClaimedUSDT, 6),
        canUnstake: stakingInfo.canUnstake,
        lastStakeTime: new Date(stakingInfo.lastStakeTime.toNumber() * 1000).toISOString()
      } : null
    };
  }));
};