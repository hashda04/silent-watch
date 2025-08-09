import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 4001;

// Save logs inside backend/logs/silentwatch-logs.json
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_PATH = path.join(LOG_DIR, 'silentwatch-logs.json');

// Make sure logs folder exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

console.log(`[SilentWatch Backend] Logs will be saved at: ${LOG_PATH}`);

// Middleware
app.use(cors());
app.use(express.json());

// Log endpoint
app.post('/log', (req, res) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event: req.body.event || 'No event',
  };

  fs.appendFile(LOG_PATH, JSON.stringify(logData) + '\n', (err) => {
    if (err) {
      console.error('[SilentWatch Backend] Failed to save log:', err);
      return res.status(500).json({ status: 'error' });
    }

    console.log('[SilentWatch Backend] Log saved:', logData);
    res.status(200).json({ status: 'ok' });
  });
});

app.listen(PORT, () => {
  console.log(`[SilentWatch Backend] Running on http://localhost:${PORT}`);
});
