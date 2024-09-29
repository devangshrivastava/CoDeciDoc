const express = require('express');
const cors = require('cors');
const ws = require('ws');
const http = require('http');
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
const pendingSDPs = new Map();
const pendingCandidates = new Map();

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
  let clientId = null;
  let closed = false;
  let pongReceived = true;

  // Ping mechanism to check for connection health
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
    pongReceived = true;
  });

  conn.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    if (clientId && clients.has(clientId)) {
      clients.delete(clientId);
    }
    closed = true;
    clearInterval(pingInterval);
  });

  conn.on('message', (message) => {
    try {
      if (typeof message === 'string') {
        message = JSON.parse(message);
      } else if (message instanceof Buffer) {
        message = JSON.parse(message.toString());
      }

      if (message && message.type && !closed) {
        console.log(`Received message from client ${clientId || 'unregistered'}:`, message);

        switch (message.type) {
          case 'register':
            clientId = message.userId;
            clients.set(clientId, conn);
            console.log(`Client registered with ID: ${clientId}`);
            
            // Send registration confirmation
            send(conn, { type: 'registerSuccess', userId: clientId });

            // Send any pending SDPs and ICE candidates to this client
            if (pendingSDPs.has(clientId)) {
              const pendingMessages = pendingSDPs.get(clientId);
              for (const pendingMessage of pendingMessages) {
                send(conn, pendingMessage);
              }
              pendingSDPs.delete(clientId);
            }

            if (pendingCandidates.has(clientId)) {
              const pendingMessages = pendingCandidates.get(clientId);
              for (const pendingMessage of pendingMessages) {
                send(conn, pendingMessage);
              }
              pendingCandidates.delete(clientId);
            }
            break;

          case 'offer':
            console.log(`Received SDP offer from ${clientId} to ${message.receiverId}`);
            const receiverConnOffer = clients.get(message.receiverId);
            if (receiverConnOffer) {
              send(receiverConnOffer, { ...message, senderId: clientId });
            } else {
              console.log(`Receiver ${message.receiverId} not connected for offer. Storing offer.`);
              if (!pendingSDPs.has(message.receiverId)) {
                pendingSDPs.set(message.receiverId, []);
              }
              pendingSDPs.get(message.receiverId).push({ ...message, senderId: clientId });
            }
            break;

          case 'answer':
            console.log(`Received SDP answer from ${clientId} to ${message.receiverId}`);
            const receiverConnAnswer = clients.get(message.receiverId);
            if (receiverConnAnswer) {
              send(receiverConnAnswer, { ...message, senderId: clientId });
            } else {
              console.log(`Receiver ${message.receiverId} not connected for answer. Storing answer.`);
              if (!pendingSDPs.has(message.receiverId)) {
                pendingSDPs.set(message.receiverId, []);
              }
              pendingSDPs.get(message.receiverId).push({ ...message, senderId: clientId });
            }
            break;

          case 'candidate':
            console.log(`Received ICE candidate from ${clientId} to ${message.receiverId}`);
            const receiverConnCandidate = clients.get(message.receiverId);
            if (receiverConnCandidate) {
              send(receiverConnCandidate, { ...message, senderId: clientId });
            } else {
              console.log(`Receiver ${message.receiverId} not connected for ICE candidate. Storing candidate.`);
              if (!pendingCandidates.has(message.receiverId)) {
                pendingCandidates.set(message.receiverId, []);
              }
              pendingCandidates.get(message.receiverId).push({ ...message, senderId: clientId });
            }
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
  console.log('New WebSocket connection established');
  ws.on('error', (error) => console.error('WebSocket error:', error));
  onconnection(ws);
});

server.on('upgrade', (request, socket, head) => {
  console.log('Upgrade request received');
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(port, host, () => {
  console.log(`Signaling server running on ${host}:${port}`);
});
