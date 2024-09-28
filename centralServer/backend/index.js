const express = require('express');
const cors = require('cors');
const ws = require('ws');
const http = require('http');
const map = require('lib0/dist/map.cjs');
require('dotenv').config();

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

const pingTimeout = 30000;

const port = process.env.PORT || 4444;
const host = process.env.HOST || 'localhost';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new ws.Server({ noServer: true });

const clients = new Map();

const send = (conn, message) => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    conn.close();
  }
  try {
    conn.send(JSON.stringify(message));
    console.log('Sent message to client:', message);
  } catch (e) {
    console.error('Error sending message:', e);
    conn.close();
  }
};

const onconnection = (conn) => {
  const clientId = `client_${Math.random().toString(36).substring(2, 15)}`;
  clients.set(clientId, conn);
  console.log(`Client connected with ID: ${clientId}`);

  let closed = false;
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      console.log(`Pong not received from ${clientId}, closing connection`);
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        console.error(`Error sending ping to ${clientId}:`, e);
        conn.close();
      }
    }
  }, pingTimeout);

  conn.on('pong', () => {
    console.log(`Pong received from client: ${clientId}`);
    pongReceived = true;
  });

  conn.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
    closed = true;
    clearInterval(pingInterval);
  });

  conn.on('message', (message) => {
    try {
      if (typeof message === 'string') {
        message = JSON.parse(message);
      }
      if (message && message.type && !closed) {
        console.log(`Received message from client ${clientId}:`, message);
        switch (message.type) {
          case 'offer':
          case 'answer':
          case 'candidate':
            const receiverConn = clients.get(message.receiverId);
            if (receiverConn) {
              send(receiverConn, { ...message, senderId: clientId });
              console.log(`Forwarded ${message.type} from ${clientId} to ${message.receiverId}`);
            } else {
              console.log(`Receiver ${message.receiverId} not connected`);
            }
            break;
          case 'ping':
            send(conn, { type: 'pong' });
            break;
          default:
            console.log(`Unknown message type from ${clientId}:`, message.type);
        }
      }
    } catch (e) {
      console.error(`Error processing message from ${clientId}:`, e);
    }
  });
};

wss.on('connection', (ws, req) => {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  onconnection(ws);
});

server.on('upgrade', (request, socket, head) => {
  console.log('Upgrade request received');
  wss.handleUpgrade(request, socket, head, (ws) => {
    console.log('WebSocket connection established');
    wss.emit('connection', ws, request);
  });
});

server.listen(port, host, () => {
  console.log(`Signaling server running on ${host}:${port}`);
});

// Periodic check to ensure connections are still alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

server.on('error', (error) => {
  console.error('HTTP server error:', error);
});