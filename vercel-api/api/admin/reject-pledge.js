const { getContract, getAdminSigner } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return res.json(await withErrorHandling(async () => {
    const { pledgeId, reason } = req.body;
    
    if (!pledgeId || !reason) {
      throw new Error('Missing required parameters: pledgeId, reason');
    }
    
    const adminSigner = getAdminSigner();
    const pledgeManager = getContract('PledgeManager', adminSigner);
    
    const tx = await pledgeManager.rejectAsset(pledgeId, reason);
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      reason: reason
    };
  }));
};