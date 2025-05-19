import express from 'express';
import { Server } from 'ws';
import path from 'path';
import { ErrorAnalysis, SmartError, configure } from './index';

// Configure SmartErrorLens
configure({ provider: 'mock', mockMode: true });

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

// Store latest diagram (default from SmartErrorLens)
let currentDiagram = `
graph TD
    A[Method Execution] -->|Throws Error| B[SmartError Decorator]
    B --> C[Analyze Error]
    C -->|Calls| D[LLM Provider]
    D -->|Generates| E[Prompt with Source Code]
    E --> F[AI Analysis]
    F --> G[Formatted Output]
    G --> H[Throw Original Error]
`;

// API to update diagram
app.post('/api/diagram', (req, res) => {
  const { diagram } = req.body;
  if (typeof diagram === 'string' && diagram.trim()) {
    currentDiagram = diagram;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid diagram text' });
  }
});

// API to get current diagram
app.get('/api/diagram', (req, res) => {
  res.json({ diagram: currentDiagram });
});

// WebSocket server for error logs
const wss = new Server({ port: 3001 });

// Store connected clients
const clients = new Set();

// Broadcast error logs to all connected clients
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Function to broadcast error analysis (called from SmartErrorLens)
export function broadcastError(errorInfo: ErrorAnalysis) {
  const message = JSON.stringify(errorInfo);
  clients.forEach((client: any) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Handle 404 errors with SmartErrorLens
class ErrorHandler {
  @SmartError()
  static async handleNotFound(req: express.Request, res: express.Response) {
    throw new Error(`Resource not found: ${req.originalUrl}`);
  }
}

// // Catch-all route for 404s
// app.all('*', async (req, res) => {
//   try {
//     await ErrorHandler.handleNotFound(req, res);
//     res.status(404).send('Not Found');
//   } catch (error) {
//     // Error is already handled by SmartError decorator and broadcasted
//     res.status(404).send('Not Found');
//   }
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket server running at ws://localhost:3001`);
});