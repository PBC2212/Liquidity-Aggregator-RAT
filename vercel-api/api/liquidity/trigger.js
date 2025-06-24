const { getContract, getAdminSigner } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return res.json(await withErrorHandling(async () => {
    const { assetValue, pledgerAddress } = req.body;
    
    if (!assetValue || !pledgerAddress) {
      throw new Error('Missing required parameters: assetValue, pledgerAddress');
    }
    
    const adminSigner = getAdminSigner();
    const liquidityAggregator = getContract('LiquidityAggregator', adminSigner);
    
    const tx = await liquidityAggregator.triggerLiquidityAggregation(
      ethers.utils.parseEther(assetValue.toString()),
      pledgerAddress
    );
    
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      status: 'Liquidity aggregation triggered successfully'
    };
  }));
};