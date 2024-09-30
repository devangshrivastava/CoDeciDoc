const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const port = process.env.PORT || 4444;
const host = '0.0.0.0';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Store clients by their userId
const usernames = new Map(); // Store usernames by their userId
const usernameToId = new Map(); // Store userId by username

wss.on('connection', function connection(ws) {
    let clientId = null;

    ws.on('message', function incoming(message) {
        try {
            message = JSON.parse(message);

            switch (message.type) {
                case 'register':
                    clientId = message.userId;
                    clients.set(clientId, ws);
                    console.log(`Client registered: ${clientId}`);
                    
                    // Ask for username
                    ws.send(JSON.stringify({ type: 'requestUsername' }));
                    break;

                case 'setUsername':
                    if (clientId) {
                        const username = message.username;
                        usernames.set(clientId, username);
                        usernameToId.set(username, clientId);
                        console.log(`Username set for ${clientId}: ${username}`);
                        
                        // Send registration success response back to the client
                        ws.send(JSON.stringify({ 
                            type: 'registerSuccess', 
                            userId: clientId,
                            username: username
                        }));
                    }
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                    let targetId = message.receiverId;
                    // If receiverId is not a valid UUID, assume it's a username and get the corresponding ID
                    if (!isValidUUID(targetId)) {
                        targetId = usernameToId.get(targetId);
                    }
                    console.log(`Attempting to forward ${message.type} from ${clientId} to ${targetId}`);
                    const targetClient = clients.get(targetId);
                    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                        console.log(`Successfully forwarding ${message.type} from ${clientId} to ${targetId}`);
                        targetClient.send(JSON.stringify({
                            ...message,
                            senderId: clientId,
                            senderUsername: usernames.get(clientId),
                            receiverId: targetId,
                            receiverUsername: usernames.get(targetId)
                        }));
                    } else {
                        console.error(`Receiver ${targetId} not found or connection is closed. Client map size: ${clients.size}`);
                        console.log(`Current clients in map: ${Array.from(clients.keys()).join(', ')}`);
                        // Send error message back to sender
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `User ${message.receiverId} not found or offline.`
                        }));
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
            const username = usernames.get(clientId);
            clients.delete(clientId);
            usernames.delete(clientId);
            usernameToId.delete(username);
            console.log(`Client disconnected: ${clientId} (${username})`);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId || 'unknown'}:`, error);
    });
});

function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

server.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});