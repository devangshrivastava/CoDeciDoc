// src/hooks/useSocket.js

import { useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';
import { handleOffer, handleAnswer, handleCandidate } from '../handlers/socketHandlers';

const useSocket = ({
    userEmail,
    setConnectionStatus,
    setPeerEmail,
    peerEmailRef,
    setCallInitiated,
    socketRef,
    createPeerConnection,
    dataChannelRef,
    setupDataChannelEvents,
    ydocRef,
    ytextRef,
    peerConnectionRef,
    iceCandidatesQueue,
}) => {
  

  const connectSocketIO = useCallback(() => {
    if (!userEmail) return;

    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      socketRef.current.emit('register', { userEmail });
      setConnectionStatus('Connected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setConnectionStatus('Disconnected');
    });

    socketRef.current.on('registerSuccess', () => {
      console.log('Registration successful');
      setConnectionStatus('Registered');
    });

    socketRef.current.on('offer', (message) => {
        console.log(`Offer received from ${message.senderEmail}`);
        setPeerEmail(message.senderEmail);
        peerEmailRef.current = message.senderEmail;
        handleOffer({
            offer: message.offer,
            senderEmail: message.senderEmail,
            setPeerEmail,
            peerEmailRef,
            createPeerConnection,
            dataChannelRef,
            setupDataChannelEvents,
            ydocRef,
            ytextRef,
            socketRef,
            userEmail,
            
          });
        setCallInitiated(true);
    });

    socketRef.current.on('authorizationError', (message) => {
        alert('You are not authorized to access this document');
        console.error('Authorization error:', message.message);
    });
  
      socketRef.current.on('answer', (message) => {
        console.log(`Answer received from ${message.senderEmail}`);
        setPeerEmail(message.senderEmail);
        handleAnswer({
            answer: message.answer, 
            peerConnectionRef
        });
        setCallInitiated(true);
    });

    socketRef.current.on('candidate', (message) => {
      console.log(`ICE candidate received from ${message.senderEmail}:`, JSON.stringify(message.candidate));
      handleCandidate({
        candidate: message.candidate,
        peerConnectionRef,
        iceCandidatesQueue,
      });
    });

    socketRef.current.on('errorMessage', (error) => {
      console.error('Error from server:', error.message);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }, [userEmail, handleOffer, handleAnswer, handleCandidate, setConnectionStatus, peerEmailRef, setPeerEmail, setCallInitiated]);

  return { connectSocketIO, socketRef };
};

export default useSocket;
