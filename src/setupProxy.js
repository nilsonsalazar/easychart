const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://sig-ma.es',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': ''
      }
    })
  );
};