const { db } = require('../db');
const { apiCalls } = require('../../shared/schema');

async function trackExternalApiCall(endpoint, method, statusCode, responseTime, service) {
  try {
    await db.insert(apiCalls).values({
      endpoint: `[${service}] ${endpoint}`,
      method,
      userId: null,
      statusCode,
      responseTime
    });
  } catch (err) {
    console.error('External API tracking error:', err.message);
  }
}

module.exports = { trackExternalApiCall };
