import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Y from 'yjs';
import './App.css';

function App() {
    const [userId] = useState(uuidv4());
    const [username, setUsername] = useState('');
    const [peerId, setPeerId] = useState('');
    const [peerUsername, setPeerUsername] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [callInitiated, setCallInitiated] = useState(false);
    const [text, setText] = useState('');
    const peerConnectionRef = useRef(null);
    const ws = useRef(null);
    const dataChannelRef = useRef(null);
    const iceCandidatesQueue = useRef([]);
    const ydocRef = useRef(null);
    const ytextRef = useRef(null);

    const connectWebSocket = useCallback(() => {
        ws.current = new WebSocket('ws://172.31.113.12:4444');
        ws.current.onopen = () => {
            console.log('WebSocket connected');
            ws.current.send(JSON.stringify({ type: 'register', userId }));
        };
        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            switch (message.type) {
                case 'requestUsername':
                    const enteredUsername = prompt("Please enter your username:");
                    if (enteredUsername) {
                        setUsername(enteredUsername);
                        ws.current.send(JSON.stringify({ type: 'setUsername', username: enteredUsername }));
                    }
                    break;
                case 'registerSuccess':
                    console.log(`Registration successful: ${message.userId}, Username: ${message.username}`);
                    setConnectionStatus('Registered');
                    break;
                case 'offer':
                    console.log(`Offer received from ${message.senderId} (${message.senderUsername})`);
                    setPeerId(message.senderId);
                    setPeerUsername(message.senderUsername);
                    handleOffer(message);
                    setCallInitiated(true);
                    break;
                case 'answer':
                    console.log(`Answer received from ${message.senderId} (${message.senderUsername})`);
                    setPeerUsername(message.senderUsername);
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
            setConnectionStatus('Disconnected');
        };
        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, [userId]);

    const sendIceCandidate = useCallback((candidate) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && peerId) {
            console.log('Sending ICE candidate:', candidate);
            ws.current.send(JSON.stringify({
                type: 'candidate',
                candidate,
                senderId: userId,
                receiverId: peerId
            }));
        } else {
            console.log('Queueing ICE candidate');
            iceCandidatesQueue.current.push(candidate);
        }
    }, [userId, peerId]);


    

    const createPeerConnection = useCallback(() => {
        console.log('Creating peer connection');
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
            ],
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10
        });
    
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log('New ICE candidate:', candidate);
                sendIceCandidate(candidate);
            }
        };
    
        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state change:', pc.iceConnectionState);
            setConnectionStatus(pc.iceConnectionState);
        };
    
        pc.onconnectionstatechange = () => {
            console.log('Connection state change:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                console.log('Peers connected!');
            } else if (pc.connectionState === 'failed') {
                console.error('Connection failed. Attempting to restart ICE...');
                pc.restartIce();
            }
        };
    
        pc.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', pc.iceGatheringState);
        };
    
        dataChannelRef.current = pc.createDataChannel('editorChannel');
        setupDataChannelEvents();
        peerConnectionRef.current = pc;
    
        return pc;
    }, [sendIceCandidate]);
    
    const setupDataChannelEvents = () => {
        dataChannelRef.current.onopen = () => {
            console.log('Data channel is open');
            initializeYjs();
        };
        dataChannelRef.current.onmessage = (event) => {
            console.log('Data channel message received:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'yjsUpdate') {
                Y.applyUpdate(ydocRef.current, new Uint8Array(data.update));
            }
        };
        dataChannelRef.current.onclose = () => {
            console.log('Data channel is closed');
        };
        dataChannelRef.current.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    };

    const initializeYjs = () => {
        ydocRef.current = new Y.Doc();
        ytextRef.current = ydocRef.current.getText('shared');

        ytextRef.current.observe(event => {
            setText(ytextRef.current.toString());
        });

        ydocRef.current.on('update', update => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                dataChannelRef.current.send(JSON.stringify({
                    type: 'yjsUpdate',
                    update: Array.from(update)
                }));
            }
        });
    };

    const handleOffer = useCallback(({ offer, senderId }) => {
        setPeerId(senderId);
        const pc = createPeerConnection();
       
        pc.ondatachannel = (event) => {
            dataChannelRef.current = event.channel;
            setupDataChannelEvents();
        };

        pc.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
            console.log('Sending answer');
            ws.current.send(JSON.stringify({
                type: 'answer',
                answer: pc.localDescription,
                senderId: userId,
                receiverId: senderId
            }));
        })
        .catch(console.error);
    }, [createPeerConnection, userId]);

    const handleAnswer = useCallback(({ answer }) => {
        const pc = peerConnectionRef.current;
        pc.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                console.log('Remote description set successfully');
            })
            .catch(console.error);
    }, []);

    const handleCandidate = useCallback(({ candidate }) => {
        const pc = peerConnectionRef.current;
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .then(() => console.log('ICE candidate added successfully'))
                .catch(error => console.error('Error adding ICE candidate:', error));
        } else {
            console.log('Queueing ICE candidate');
            iceCandidatesQueue.current.push(candidate);
        }
    }, []);

    const callPeer = useCallback(() => {
        if (!peerId) {
            alert('Please enter a peer ID');
            return;
        }
        const pc = createPeerConnection();

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                console.log('Sending offer');
                ws.current.send(JSON.stringify({
                    type: 'offer',
                    offer: pc.localDescription,
                    senderId: userId,
                    receiverId: peerId
                }));
            })
            .catch(console.error);
        setCallInitiated(true);
    }, [createPeerConnection, userId, peerId]);

    const handleTextChange = (e) => {
        const newText = e.target.value;
        setText(newText);

        if (ytextRef.current) {
            ytextRef.current.delete(0, ytextRef.current.length);
            ytextRef.current.insert(0, newText);
        }
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            console.log('Cleaning up WebSocket and peer connection');
            peerConnectionRef.current?.close();
            ws.current?.close();
            if (ydocRef.current) {
                ydocRef.current.destroy();
            }
        };
    }, [connectWebSocket]);

    useEffect(() => {
        if (peerConnectionRef.current && iceCandidatesQueue.current.length > 0) {
            iceCandidatesQueue.current.forEach(candidate => {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .then(() => console.log('Queued ICE candidate added successfully'))
                    .catch(error => console.error('Error adding queued ICE candidate:', error));
            });
            iceCandidatesQueue.current = [];
        }
    }, [peerId]);

    return (
        <div className="app-container">
            <div>Status: {connectionStatus}</div>
            <div>Your ID: {userId}</div>
            <div>Your Username: {username}</div>
            {callInitiated ? (
                <div>
                    <p>{`Connected with ${peerUsername} (${peerId})`}</p>
                    <textarea
                        value={text}
                        onChange={handleTextChange}
                        placeholder="Start typing..."
                        style={{ width: '100%', height: '300px' }}
                    />
                </div>
            ) : (
                <div>
                    <input
                        value={peerId}
                        onChange={e => setPeerId(e.target.value)}
                        placeholder="Enter peer ID"
                        className="peer-input"
                    />
                    <button onClick={callPeer} disabled={callInitiated} className="call-button">
                        Call Peer
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;