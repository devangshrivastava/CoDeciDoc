const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const port = process.env.PORT || 4444;
const host = process.env.HOST || 'localhost';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Store clients by their userId

wss.on('connection', function connection(ws) {
    let clientId = null; // Track the current clientId associated with this WebSocket connection

    ws.on('message', function incoming(message) {
        try {
            message = JSON.parse(message);

            switch (message.type) {
                case 'register':
                    clientId = message.userId; // Assign the userId to this connection
                    clients.set(clientId, ws); // Store the WebSocket in the clients map
                    console.log(`Client registered: ${clientId}`);
                    
                    // Send registration success response back to the client
                    ws.send(JSON.stringify({ type: 'registerSuccess', userId: clientId }));
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                    console.log(`Attempting to forward ${message.type} from ${clientId} to ${message.receiverId}`);
                    const targetClient = clients.get(message.receiverId);
                    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                        console.log(`Successfully forwarding ${message.type} from ${clientId} to ${message.receiverId}`);
                        targetClient.send(JSON.stringify(message));
                    } else {
                        console.error(`Receiver ${message.receiverId} not found or connection is closed. Client map size: ${clients.size}`);
                        console.log(`Current clients in map: ${Array.from(clients.keys()).join(', ')}`);
                    }
                    break;
                default:
                    console.error(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error(`Error parsing message:`, error);
        }
    });

    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId); // Remove the client from the map on disconnection
            console.log(`Client disconnected: ${clientId}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId || 'unknown'}:`, error);
    });
});

server.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});
