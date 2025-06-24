function formatResponse(success, data, message = '') {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

function handleError(error) {
  console.error('API Error:', error);
  return formatResponse(false, null, error.message || 'Internal server error');
}

async function withErrorHandling(handler) {
  try {
    const result = await handler();
    return formatResponse(true, result);
  } catch (error) {
    return handleError(error);
  }
}

function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (next) next();
}

module.exports = {
  formatResponse,
  handleError,
  withErrorHandling,
  cors
};