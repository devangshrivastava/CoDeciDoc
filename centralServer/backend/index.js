const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { Server } = require('socket.io');

const port = 4444;
const host = '172.31.113.12';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', // Replace with your client's origin if needed
        methods: ['GET', 'POST']
    }
});

const clients = new Map(); // Store clients by their userId (sockets)
const usernames = new Map(); // Store usernames by their userId
const usernameToId = new Map(); // Store userId by username

io.on('connection', (socket) => {
    let clientId = null;

    socket.on('register', (message) => {
        clientId = message.userId;
        clients.set(clientId, socket);
        console.log(`Client registered: ${clientId}`);

        // Ask for username
        socket.emit('requestUsername');
    });

    socket.on('setUsername', (message) => {
        if (clientId) {
            const username = message.username;
            usernames.set(clientId, username);
            usernameToId.set(username, clientId);
            console.log(`Username set for ${clientId}: ${username}`);

            // Send registration success response back to the client
            socket.emit('registerSuccess', {
                userId: clientId,
                username: username
            });
        }
    });

    socket.on('offer', (message) => {
        handleOffer(message, clientId, socket);
    });

    socket.on('answer', (message) => {
        handleAnswer(message, clientId, socket);
    });

    socket.on('candidate', (message) => {
        handleCandidate(message, clientId, socket);
    });

    socket.on('disconnect', () => {
        if (clientId) {
            const username = usernames.get(clientId);
            clients.delete(clientId);
            usernames.delete(clientId);
            usernameToId.delete(username);
            console.log(`Client disconnected: ${clientId} (${username})`);
        }
    });

    socket.on('error', (error) => {
        console.error(`Socket error for client ${clientId || 'unknown'}:`, error);
    });
});

function forwardMessage(message, clientId, socket, messageType) {
    let targetId = message.receiverId;

    // If receiverId is not a valid UUID, assume it's a username and get the corresponding ID
    if (!isValidUUID(targetId)) {
        targetId = usernameToId.get(targetId);
    }

    console.log(`Attempting to forward ${messageType} from ${usernames.get(clientId)} to ${usernames.get(targetId)}`);

    const targetClient = clients.get(targetId);
    if (targetClient) {
        console.log(`Successfully forwarding ${messageType} from ${usernames.get(clientId)} to ${usernames.get(targetId)}`);
        targetClient.emit(messageType, {
            ...message,
            senderId: clientId,
            senderUsername: usernames.get(clientId),
            receiverId: targetId,
            receiverUsername: usernames.get(targetId)
        });
    } else {
        console.error(`Receiver ${targetId} not found or connection is closed. Client map size: ${clients.size}`);
        console.log(`Current clients in map: ${Array.from(clients.keys()).join(', ')}`);

        // Send error message back to sender
        socket.emit('errorMessage', {
            message: `User ${message.receiverId} not found or offline.`
        });
    }
}

// Function to handle 'offer' messages
function handleOffer(message, clientId, socket) {
    if (!message.offer || !message.receiverId) {
        console.error(`Invalid offer message from ${clientId}`);
        socket.emit('errorMessage', {
            message: `Invalid offer message. Missing 'offer' or 'receiverId'.`
        });
        return;
    }

    forwardMessage(message, clientId, socket, 'offer');
}

// Function to handle 'answer' messages
function handleAnswer(message, clientId, socket) {
    if (!message.answer || !message.receiverId) {
        console.error(`Invalid answer message from ${clientId}`);
        socket.emit('errorMessage', {
            message: `Invalid answer message. Missing 'answer' or 'receiverId'.`
        });
        return;
    }

    forwardMessage(message, clientId, socket, 'answer');
}

// Function to handle 'candidate' messages
function handleCandidate(message, clientId, socket) {
    if (!message.candidate || !message.receiverId) {
        console.error(`Invalid candidate message from ${clientId}`);
        socket.emit('errorMessage', {
            message: `Invalid candidate message. Missing 'candidate' or 'receiverId'.`
        });
        return;
    }

    forwardMessage(message, clientId, socket, 'candidate');
}

function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

server.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
});
