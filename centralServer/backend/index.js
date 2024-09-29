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

const clients = new Map();

wss.on('connection', function connection(ws) {
    let clientId = null;

    ws.on('message', function incoming(message) {
        message = JSON.parse(message);

        switch (message.type) {
            case 'register':
                clientId = message.userId;
                clients.set(clientId, ws);
                console.log(`Client registered: ${clientId}`);
                ws.send(JSON.stringify({ type: 'registerSuccess', userId: clientId }));
                break;
            case 'offer':
            case 'answer':
            case 'candidate':
                const targetClient = clients.get(message.receiverId);
                if (targetClient) {
                    console.log(`Forwarding ${message.type} from ${clientId} to ${message.receiverId}`);
                    targetClient.send(JSON.stringify(message));
                } else {
                    console.log(`Receiver ${message.receiverId} not found`);
                }
                break;
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}`);
    });
});

server.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});
