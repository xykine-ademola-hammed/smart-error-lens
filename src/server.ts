import express from 'express';
import { Server } from 'ws';
import path from 'path';
import { clients } from './broadcaster'; // Import from broadcaster.ts


const app = express();
const port = 3040;

// Reject invalid URLs early
app.use((req, res, next) => {
  if (!req.url.startsWith('/')) {
    console.log(`Invalid URL rejected: ${req.url}`);
    res.status(400).send('Invalid URL format');
    return;
  }
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
  console.log(`IP: ${req.ip}`);
  next();
});

// Serve static files with error logging
app.use(express.static(path.join(__dirname, '..', 'public'), {
  fallthrough: true
}), (req, res, next) => {
  console.log(`Static file not found: ${req.url}`);
  next();
});

// Parse JSON bodies
app.use(express.json());

// WebSocket server for error logs
const wss = new Server({ port: 3001 });

// Broadcast error logs to all connected clients
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket server running at ws://localhost:3001`);
});