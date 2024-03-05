const config = {
  server: '192.168.200.221',
  port: 1433,
  user: 'aajuria',
  password: 'Ihtt2024_',
  database: 'IHTT_PROVEEDURIA',
  options: {
      encrypt: true, // Encrypt data
      trustServerCertificate: true // Ignore self-signed certificate errors
  }
};

module.exports = config;