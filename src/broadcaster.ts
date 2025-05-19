import { ErrorAnalysis } from './index';

// Function to broadcast error analysis
export function broadcastError(errorInfo: ErrorAnalysis) {
  const message = JSON.stringify(errorInfo);
  clients.forEach((client: any) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Store connected clients (accessed by server.ts)
export const clients = new Set();