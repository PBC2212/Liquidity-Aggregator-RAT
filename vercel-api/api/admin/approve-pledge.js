const { getContract, getAdminSigner } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return res.json(await withErrorHandling(async () => {
    const { pledgeId, approvedValue } = req.body;
    
    if (!pledgeId || !approvedValue) {
      throw new Error('Missing required parameters: pledgeId, approvedValue');
    }
    
    const adminSigner = getAdminSigner();
    const pledgeManager = getContract('PledgeManager', adminSigner);
    
    const tx = await pledgeManager.approveAsset(
      pledgeId,
      ethers.utils.parseEther(approvedValue.toString())
    );
    
    const receipt = await tx.wait();
    const pledge = await pledgeManager.pledges(pledgeId);
    
    return {
      transactionHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      ratTokensIssued: ethers.utils.formatEther(pledge.ratTokensIssued),
      autoStaked: pledge.autoStaked,
      approvalTime: new Date(pledge.approvalTime.toNumber() * 1000).toISOString()
    };
  }));
};