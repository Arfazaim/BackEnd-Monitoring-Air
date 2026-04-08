/**
 * Middleware validasi API Key.
 * ESP32 harus mengirim header: x-api-key: <API_KEY>
 */
const apiKeyMiddleware = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: API key tidak valid atau tidak ada.',
    });
  }
  next();
};

module.exports = { apiKeyMiddleware };
