import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const [userId, setUserId] = useState(uuidv4());
    const [peerId, setPeerId] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [callInitiated, setCallInitiated] = useState(false);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const peerConnectionRef = useRef(null);
    const ws = useRef(null);
    const dataChannelRef = useRef(null);

    const connectWebSocket = useCallback(() => {
        ws.current = new WebSocket('ws://localhost:4444');
        ws.current.onopen = () => {
            console.log('WebSocket connected');
            ws.current.send(JSON.stringify({ type: 'register', userId }));
        };
        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            switch (message.type) {
                case 'registerSuccess':
                    console.log(`Registration successful: ${message.userId}`);
                    setConnectionStatus('Registered');
                    break;
                case 'offer':
                    console.log(`Offer received from ${message.senderId}`);
                    handleOffer(message);
                    setCallInitiated(true);
                    break;
                case 'answer':
                    console.log(`Answer received from ${message.senderId}`);
                    handleAnswer(message);
                    setCallInitiated(true);
                    break;
                case 'candidate':
                    console.log(`ICE candidate received from ${message.senderId}`);
                    handleCandidate(message);
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        };
        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
        };
        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [userId]);

    const createPeerConnection = useCallback(() => {
        console.log('Creating peer connection');
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log('Sending ICE candidate:', candidate);
                ws.current.send(JSON.stringify({ type: 'candidate', candidate, senderId: userId, receiverId: peerId }));
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state change:', pc.iceConnectionState);
            setConnectionStatus(pc.iceConnectionState);
        };
        pc.onconnectionstatechange = () => {
            console.log('Connection state change:', pc.connectionState);
        };
        // Create data channel for chat messages
        dataChannelRef.current = pc.createDataChannel("chatChannel");
        setupDataChannelEvents();
        peerConnectionRef.current = pc;
        return pc;
    }, [peerId, userId]);

    const setupDataChannelEvents = () => {
        dataChannelRef.current.onopen = () => {
            console.log('Data channel is open');
        };
        dataChannelRef.current.onmessage = (event) => {
            const data = event.data;
            console.log('Received message on data channel:', data);
            setChatMessages(messages => [...messages, { id: uuidv4(), text: data }]);
        };
        dataChannelRef.current.onclose = () => {
            console.log('Data channel is closed');
        };
        dataChannelRef.current.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    };

    const handleOffer = useCallback(({ offer, senderId }) => {
        const pc = createPeerConnection();
        pc.ondatachannel = (event) => {
            dataChannelRef.current = event.channel;
            setupDataChannelEvents();
        };
        pc.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
            console.log('Remote description set with offer');
            return pc.createAnswer();
        }).then(answer => {
            console.log('Answer created:', answer);
            pc.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer, senderId: userId, receiverId: senderId }));
        }).catch(console.error);
    }, [createPeerConnection, userId]);

    const handleAnswer = useCallback(({ answer }) => {
        const pc = peerConnectionRef.current;
        console.log('Setting remote description with answer');
        pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
    }, []);

    const handleCandidate = useCallback(({ candidate }) => {
        const pc = peerConnectionRef.current;
        console.log('Adding ICE candidate');
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    }, []);

    const callPeer = useCallback(() => {
        const pc = createPeerConnection();
        console.log('Creating offer');
        pc.createOffer().then(offer => {
            console.log('Offer created:', offer);
            pc.setLocalDescription(offer);
            ws.current.send(JSON.stringify({ type: 'offer', offer, senderId: userId, receiverId: peerId }));
        }).catch(console.error);
        setCallInitiated(true);
    }, [createPeerConnection, userId, peerId]);

    const sendMessage = useCallback(() => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
            console.log('Sending message:', message);
            dataChannelRef.current.send(message);
            setChatMessages(messages => [...messages, { id: uuidv4(), text: message, own: true }]);
            setMessage('');
        }
    }, [message]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            console.log('Cleaning up WebSocket and peer connection');
            peerConnectionRef.current?.close();
            ws.current?.close();
        };
    }, [connectWebSocket]);

    return (
        <div>
            <div>Status: {connectionStatus}</div>
            {callInitiated ? (
                <div>
                    <p>{`Connection established with ${peerId}`}</p>
                    <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter your message" />
                    <button onClick={sendMessage}>Send Message</button>
                    <div>
                        {chatMessages.map(msg => (
                            <p key={msg.id} style={{ color: msg.own ? 'blue' : 'green' }}>{msg.text}</p>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <input value={peerId} onChange={e => setPeerId(e.target.value)} placeholder="Enter peer ID" />
                    <button onClick={callPeer} disabled={callInitiated}>Call Peer</button>
                </div>
            )}
        </div>
    );
}

export default App;
