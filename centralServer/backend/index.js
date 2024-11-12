const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
const http = require('http');
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const { Server } = require('socket.io');
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const port = process.env.PORT;
const host = process.env.HOST;
const DATABASE_URL = process.env.DATABASE_URL;

connectDB(DATABASE_URL);

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/user", userRoutes);
app.use("/api/document", documentRoutes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const userToSocket = new Map();

io.on('connection', (socket) => {
  let userEmail = null;

  socket.on('register', ({userEmail}) => {
    userToSocket.set(userEmail, socket);
    console.log(`User registered: ${userEmail}`);
    socket.emit('registerSuccess', {
      username: userEmail
    });
  });

  socket.on('offer', (message) => {
    handleOffer(message, socket);
  });

  socket.on('answer', (message) => {
    handleAnswer(message, socket);
  });

  socket.on('candidate', (message) => {
    handleCandidate(message, socket);
  });

  socket.on('disconnect', () => {
    if (userEmail) {
      userToSocket.delete(userEmail);
      console.log(`User disconnected: ${userEmail}`);
    }
  });

  socket.on('error', (error) => {
    console.error(`Socket error for user ${userEmail || 'unknown'}:`, error);
  });
});

function forwardMessage(message, socket, messageType) {
  const { senderEmail, receiverEmail } = message;

  console.log(`Attempting to forward ${messageType} from ${senderEmail} to ${receiverEmail}`);

  const receiverSocket = userToSocket.get(receiverEmail);
  if (receiverSocket) {
    console.log(`Successfully forwarding ${messageType} from ${senderEmail} to ${receiverEmail}`);
    receiverSocket.emit(messageType, {
      ...message,
      senderEmail,
      receiverEmail
    });
  } else {
    console.error(`Receiver ${receiverEmail} not found or connection is closed. Active users: ${userToSocket.size}`);
    socket.emit('errorMessage', {
      message: `User ${receiverEmail} not found or offline.`
    });
  }
}

function handleOffer(message, socket) {
  if (!message.offer || !message.receiverEmail) {
    console.error(`Invalid offer message from ${message.senderEmail}`);
    socket.emit('errorMessage', {
      message: `Invalid offer message. Missing 'offer' or 'receiverEmail'.`
    });
    return;
  }

  forwardMessage(message, socket, 'offer');
}

function handleAnswer(message, socket) {
  if (!message.answer || !message.receiverEmail) {
    console.error(`Invalid answer message from ${message.senderEmail}`);
    socket.emit('errorMessage', {
      message: `Invalid answer message. Missing 'answer' or 'receiverEmail'.`
    });
    return;
  }

  forwardMessage(message, socket, 'answer');
}

function handleCandidate(message, socket) {
  if (!message.candidate || !message.receiverEmail) {
    console.error(`Invalid candidate message from ${message.senderEmail}`);
    socket.emit('errorMessage', {
      message: `Invalid candidate message. Missing 'candidate' or 'receiverEmail'.`
    });
    return;
  }

  forwardMessage(message, socket, 'candidate');
}

server.listen(port, host, () => {
  console.log(`Server listening at http://${host}:${port}`);
});