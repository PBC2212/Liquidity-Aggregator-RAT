const { getContract } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  return res.json(await withErrorHandling(async () => {
    const pledgeManager = getContract('PledgeManager');
    const pendingPledges = [];
    
    for (let i = 1; i <= 100; i++) {
      try {
        const pledge = await pledgeManager.pledges(i);
        if (pledge.status === 0) {
          pendingPledges.push({
            id: i,
            pledger: pledge.pledger,
            assetDescription: pledge.assetDescription,
            estimatedValue: ethers.utils.formatEther(pledge.estimatedValue),
            documentHash: pledge.documentHash,
            pledgeTime: new Date(pledge.pledgeTime.toNumber() * 1000).toISOString(),
            assetAddress: pledge.assetAddress
          });
        }
      } catch (error) {
        break;
      }
    }
    
    return pendingPledges;
  }));
};