const express = require('express');
const dbInitializer = require('./database/init');
const { healthCheckMiddleware, readinessCheckMiddleware, livenessCheckMiddleware } = require('./database/health');
const { connectionRecoveryMiddleware } = require('./database/recovery');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connection recovery middleware
app.use(connectionRecoveryMiddleware);

// Health check endpoints
app.get('/health', healthCheckMiddleware);
app.get('/ready', readinessCheckMiddleware);
app.get('/alive', livenessCheckMiddleware);

// Example route
app.get('/', (req, res) => {
  res.json({
    message: 'Scoring System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connections
    await dbInitializer.initialize();
    
    // Test connections
    await dbInitializer.testConnections();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Readiness check: http://localhost:${PORT}/ready`);
      console.log(`Liveness check: http://localhost:${PORT}/alive`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await dbInitializer.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await dbInitializer.close();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  startServer();
}

module.exports = app;
