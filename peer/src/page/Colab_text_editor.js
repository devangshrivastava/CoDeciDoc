import React, { useState, useEffect, useRef, useCallback } from 'react';
import Quill from 'quill';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import { WebrtcProvider } from 'y-webrtc';

const signalingServerUrl = process.env.REACT_APP_SIGNALING_SERVER_URL || 'ws://localhost:4444';

function ColabTextEditor() {
  const [userId, setUserId] = useState('');
  const [peerId, setPeerId] = useState('');
  const [status, setStatus] = useState('Unregistered');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [detailedStatus, setDetailedStatus] = useState('');
  const peerConnectionRef = useRef(null);
  const signalingServer = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOfferSent, setIsOfferSent] = useState(false);

  const createPeerConnection = useCallback((peerId) => {
    if (peerConnectionRef.current) {
      console.log('Peer connection already exists.');
      return peerConnectionRef.current;
    }

    console.log('Creating peer connection');
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        sendMessage({
          type: 'candidate',
          candidate: event.candidate,
          senderId: userId,
          receiverId: peerId,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
      setConnectionStatus(pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setIsConnected(true);
        setDetailedStatus('Peer connection established');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state changed:', pc.connectionState);
      setConnectionStatus(pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setDetailedStatus('Peer connection established');
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setIsConnected(false);
        setDetailedStatus(`Connection ${pc.connectionState}`);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [userId]);

  const sendMessage = useCallback((message) => {
    if (signalingServer.current?.readyState === WebSocket.OPEN) {
      signalingServer.current.send(JSON.stringify(message));
      console.log('Sent message:', message);
    } else {
      console.log('WebSocket not open. Message not sent:', message);
    }
  }, []);

  const handleOffer = async (data) => {
    console.log('Received offer from peer:', data.senderId);
    setDetailedStatus('Received offer. Creating answer...');
    const pc = createPeerConnection(data.senderId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('Set remote description with offer');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Created and set local description with answer');
      sendMessage({
        type: 'answer',
        answer: pc.localDescription,
        senderId: userId,
        receiverId: data.senderId,
      });
      setDetailedStatus('Answer sent. Waiting for connection...');
    } catch (error) {
      console.error('Error handling offer:', error);
      setDetailedStatus('Error handling offer');
    }
  };

  const handleAnswer = async (data) => {
    console.log('Received answer from peer:', data.senderId);
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Set remote description with answer');
      setDetailedStatus('Answer received. Establishing connection...');
    } catch (error) {
      console.error('Error setting remote description:', error);
      setDetailedStatus('Error handling answer');
    }
  };

  const handleCandidate = async (data) => {
    console.log('Received ICE candidate from peer:', data.senderId);
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('Added ICE candidate');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const createOffer = async () => {
    const pc = createPeerConnection(peerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Created and set local description with offer');
      sendMessage({
        type: 'offer',
        offer: pc.localDescription,
        senderId: userId,
        receiverId: peerId,
      });
      setIsOfferSent(true);
      setDetailedStatus('Offer sent. Waiting for answer...');
    } catch (error) {
      console.error('Error creating offer:', error);
      setDetailedStatus('Error creating offer');
    }
  };

  const connectToSignalingServer = useCallback(() => {
    signalingServer.current = new WebSocket(signalingServerUrl);

    signalingServer.current.onopen = () => {
      console.log('Connected to signaling server');
      setStatus('Connecting...');
      signalingServer.current.send(JSON.stringify({ type: 'register', userId }));
    };

    signalingServer.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log('Received message:', data);
      switch (data.type) {
        case 'registerSuccess':
          setStatus(`Registered as ${data.userId}`);
          setDetailedStatus('Registered with signaling server');
          break;
        case 'offer':
          await handleOffer(data);
          break;
        case 'answer':
          await handleAnswer(data);
          break;
        case 'candidate':
          await handleCandidate(data);
          break;
      }
    };

    signalingServer.current.onclose = () => {
      console.log('Disconnected from signaling server');
      setStatus('Unregistered');
      setConnectionStatus(null);
      setIsConnected(false);
      setDetailedStatus('Disconnected from signaling server');
    };

    signalingServer.current.onerror = (error) => {
      console.error('Signaling server error:', error);
      setDetailedStatus('Signaling server error');
    };
  }, [userId, handleOffer, handleAnswer, handleCandidate]);

  const handleRegister = useCallback(() => {
    if (userId.trim() === '') {
      alert('Please enter a valid User ID.');
      return;
    }
    connectToSignalingServer();
  }, [userId, connectToSignalingServer]);

  const handleConnect = useCallback(() => {
    if (peerId.trim() === '' || userId === peerId) {
      alert('Please enter a valid Peer ID different from your User ID.');
      return;
    }
    createOffer();
  }, [peerId, userId, createOffer]);

  const shouldInitiate = useCallback(() => {
    return userId < peerId;
  }, [userId, peerId]);

  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
      signalingServer.current?.close();
    };
  }, []);

  useEffect(() => {
    if (peerConnectionRef.current && isConnected) {
      console.log('Initializing collaborative text editor.');
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(peerId, ydoc, { 
        signaling: [signalingServerUrl],
        password: 'optional-room-password',
      });
      const ytext = ydoc.getText('quill');
      const quill = new Quill('#editor', {
        theme: 'snow'
      });
      const binding = new QuillBinding(ytext, quill, provider.awareness);
      
      console.log('Integrated Yjs and Quill for collaborative editing.');
      
      return () => {
        provider.destroy();
        ydoc.destroy();
        binding.destroy();
        quill.disable();
      };
    }
  }, [isConnected, peerId]);

  return (
    <div>
      <h1>Status: <span style={{ color: status === 'Unregistered' ? 'red' : 'green' }}>{status}</span></h1>
      {connectionStatus && <h2>Connection Status: {connectionStatus}</h2>}
      <h3>Detailed Status: {detailedStatus}</h3>
      <div>
        <label>User ID: </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter your User ID"
        />
        <button onClick={handleRegister} disabled={status !== 'Unregistered'}>
          Register
        </button>
      </div>
      <div>
        <label>Peer ID: </label>
        <input
          type="text"
          value={peerId}
          onChange={(e) => setPeerId(e.target.value)}
          placeholder="Enter Peer ID to connect"
        />
        <button onClick={handleConnect} disabled={status === 'Unregistered' || isConnected}>
          Connect to Peer
        </button>
      </div>
      {!shouldInitiate() && status !== 'Unregistered' && (
        <p>Waiting for peer to initiate the connection...</p>
      )}
      {shouldInitiate() && isOfferSent && !isConnected && (
        <p>Offer sent. Waiting for peer to answer...</p>
      )}
      {isConnected && (
        <p>Connected to {peerId}. You can start collaborating!</p>
      )}
      <div id="editor" style={{ height: '400px', marginTop: '20px' }}></div>
    </div>
  );
}

export default ColabTextEditor;