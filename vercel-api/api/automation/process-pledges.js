const { getContract, getAdminSigner } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  return res.json(await withErrorHandling(async () => {
    const pledgeManager = getContract('PledgeManager');
    const adminSigner = getAdminSigner();
    const pledgeManagerWithSigner = getContract('PledgeManager', adminSigner);
    const liquidityAggregator = getContract('LiquidityAggregator', adminSigner);
    
    const processedPledges = [];
    
    for (let i = 1; i <= 50; i++) {
      try {
        const pledge = await pledgeManager.pledges(i);
        
        if (pledge.status === 0) {
          const shouldAutoApprove = await checkAutoApprovalCriteria(pledge, i);
          
          if (shouldAutoApprove.approve) {
            const tx = await pledgeManagerWithSigner.approveAsset(
              i,
              ethers.utils.parseEther(shouldAutoApprove.approvedValue.toString())
            );
            
            await tx.wait();
            
            await liquidityAggregator.triggerLiquidityAggregation(
              ethers.utils.parseEther(shouldAutoApprove.approvedValue.toString()),
              pledge.pledger
            );
            
            processedPledges.push({
              pledgeId: i,
              action: 'auto_approved',
              approvedValue: shouldAutoApprove.approvedValue,
              transactionHash: tx.hash
            });
          }
        }
      } catch (error) {
        if (error.message.includes('execution reverted')) {
          break;
        }
      }
    }
    
    return {
      processed: processedPledges.length,
      pledges: processedPledges
    };
  }));
};

async function checkAutoApprovalCriteria(pledge, pledgeId) {
  const estimatedValue = parseFloat(ethers.utils.formatEther(pledge.estimatedValue));
  
  if (estimatedValue >= 1000 && 
      estimatedValue <= 100000 && 
      pledge.documentHash && 
      pledge.documentHash.length > 10 &&
      pledge.assetDescription.length > 20) {
    
    return {
      approve: true,
      approvedValue: estimatedValue
    };
  }
  
  return { approve: false };
}