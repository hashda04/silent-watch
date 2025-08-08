const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Root route for testing
app.get('/', (req, res) => {
  res.send('SilentWatch backend is running');
});

// ✅ SilentWatch log endpoint
app.post('/logs', (req, res) => {
  const logData = req.body;
  const logPath = path.join(__dirname, 'logs', 'silentwatch.jsonl');

  const line = JSON.stringify({
    ...logData,
    received_at: new Date().toISOString(),
  }) + '\n';

  fs.appendFile(logPath, line, (err) => {
    if (err) {
      console.error('Failed to write log:', err);
      return res.status(500).json({ status: 'error' });
    }
    res.json({ status: 'ok' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ SilentWatch backend running at http://localhost:${PORT}`);
});
