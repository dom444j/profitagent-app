const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.json({ status: 'ok', message: 'Simple server working' });
});

// Test auth route
app.post('/test-login', (req, res) => {
  console.log('Test login request received:', req.body);
  res.json({ success: true, message: 'Test login working' });
});

app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/health`);
});