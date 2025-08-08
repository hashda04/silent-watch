// backend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 4000;

const LOG_FILE = path.join(__dirname, 'silentwatch-logs.json');

app.use(express.json());

// ✅ Accept logs from SilentWatch
app.post('/', (req, res) => {
  const logEntry = {
    time: new Date().toISOString(),
    ...req.body,
  };

  // Append log to file
  fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', (err) => {
    if (err) {
      console.error('❌ Failed to write log:', err);
      return res.status(500).send('Failed to write log');
    }
    console.log('✅ Log received and saved.');
    res.send('Logged');
  });
});

// 🟢 Health check
app.get('/', (req, res) => {
  res.send('SilentWatch backend is running');
});

app.listen(PORT, () => {
  console.log(`🟢 SilentWatch backend running at http://localhost:${PORT}`);
});
