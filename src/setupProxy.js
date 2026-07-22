const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_BASE_URL || 'https://easychart.vercel.app',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/api'
      }
    })
  );
};