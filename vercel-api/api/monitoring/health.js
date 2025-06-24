const { getProvider } = require('../../lib/contracts');
const { withErrorHandling, cors } = require('../../lib/utils');

module.exports = async (req, res) => {
  cors(req, res);
  
  return res.json(await withErrorHandling(async () => {
    const provider = getProvider();
    
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    
    return {
      status: 'healthy',
      blockchain: {
        connected: true,
        network: network.name,
        chainId: network.chainId,
        blockNumber
      },
      api: {
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }));
};