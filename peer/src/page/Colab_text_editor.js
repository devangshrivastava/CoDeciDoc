import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io } from 'socket.io-client';
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
    const socketRef = useRef(null);
    const dataChannelRef = useRef(null);
    const iceCandidatesQueue = useRef([]);
    const ydocRef = useRef(null);
    const ytextRef = useRef(null);
    const peerIdRef = useRef('');
    const connectionTimeoutRef = useRef(null);

    const connectSocketIO = useCallback(() => {
        socketRef.current = io('http://172.31.113.12:4444');

        socketRef.current.on('connect', () => {
            console.log('Socket.IO connected');
            socketRef.current.emit('register', { userId });
            setConnectionStatus('Connected');
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setConnectionStatus('Disconnected');
        });

        socketRef.current.on('requestUsername', () => {
            const enteredUsername = prompt("Please enter your username:");
            if (enteredUsername) {
                setUsername(enteredUsername);
                socketRef.current.emit('setUsername', { username: enteredUsername });
            }
        });

        socketRef.current.on('registerSuccess', (message) => {
            console.log(`Registration successful: ${message.userId}, Username: ${message.username}`);
            setConnectionStatus('Registered');
        });

        socketRef.current.on('offer', (message) => {
            console.log(`Offer received from ${message.senderId} (${message.senderUsername})`);
            setPeerId(message.senderId);
            peerIdRef.current = message.senderId;
            setPeerUsername(message.senderUsername);
            handleOffer(message);
            setCallInitiated(true);
        });

        socketRef.current.on('answer', (message) => {
            console.log(`Answer received from ${message.senderUsername} (${message.senderId})`);
            setPeerUsername(message.senderUsername);
            handleAnswer(message);
            setCallInitiated(true);
        });

        socketRef.current.on('candidate', (message) => {
            console.log(`ICE candidate received from ${message.senderId}:`, JSON.stringify(message.candidate));
            handleCandidate(message);
        });

        socketRef.current.on('errorMessage', (error) => {
            console.error('Error from server:', error.message);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
        });
    }, [userId]);

    const sendIceCandidate = useCallback((candidate) => {
        if (socketRef.current && socketRef.current.connected && peerIdRef.current) {
            console.log('Sending ICE candidate:', JSON.stringify(candidate));
            socketRef.current.emit('candidate', {
                candidate,
                senderId: userId,
                receiverId: peerIdRef.current
            });
        } else {
            console.log('Queueing ICE candidate:', JSON.stringify(candidate));
            iceCandidatesQueue.current.push(candidate);
        }
    }, [userId]);

    const createPeerConnection = useCallback(() => {
        console.log('Creating peer connection');
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "9ed5150a9096f79487728504",
                    credential: "z+RYu0NbpK7bzo6O",
                  },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "9ed5150a9096f79487728504",
                    credential: "z+RYu0NbpK7bzo6O",
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "9ed5150a9096f79487728504",
                    credential: "z+RYu0NbpK7bzo6O",
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "9ed5150a9096f79487728504",
                    credential: "z+RYu0NbpK7bzo6O",
                },
            ],
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10
        });

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log('New ICE candidate:', JSON.stringify(candidate));
                sendIceCandidate(candidate);
            } else {
                console.log('ICE candidate gathering completed');
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state change:', pc.iceConnectionState);
            setConnectionStatus(pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected') {
                clearTimeout(connectionTimeoutRef.current);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state change:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                console.log('Peers connected!');
                clearTimeout(connectionTimeoutRef.current);
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

        // Set a connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState !== 'connected') {
                console.log('Connection timeout. Restarting ICE...');
                pc.restartIce();
            }
        }, 15000); // 15 seconds timeout

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

        ytextRef.current.observe(() => {
            setText(ytextRef.current.toString());
        });

        ydocRef.current.on('update', (update) => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                dataChannelRef.current.send(
                    JSON.stringify({
                        type: 'yjsUpdate',
                        update: Array.from(update)
                    })
                );
            }
        });
    };

    const handleOffer = useCallback(
        ({ offer, senderId }) => {
            setPeerId(senderId);
            peerIdRef.current = senderId;
            const pc = createPeerConnection();

            pc.ondatachannel = (event) => {
                dataChannelRef.current = event.channel;
                setupDataChannelEvents();
            };

            pc.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => {
                    console.log('Remote description set (offer)');
                    return pc.createAnswer();
                })
                .then((answer) => {
                    console.log('Created answer:', JSON.stringify(answer));
                    return pc.setLocalDescription(answer);
                })
                .then(() => {
                    console.log('Local description set (answer)');
                    console.log('Sending answer');
                    socketRef.current.emit('answer', {
                        answer: pc.localDescription,
                        senderId: userId,
                        receiverId: senderId
                    });
                })
                .catch((error) => console.error('Error during offer handling:', error));
        },
        [createPeerConnection, userId]
    );

    const handleAnswer = useCallback(({ answer }) => {
        const pc = peerConnectionRef.current;
        pc.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                console.log('Remote description set successfully (answer)');
            })
            .catch((error) => console.error('Error setting remote description:', error));
    }, []);

    const handleCandidate = useCallback(({ candidate }) => {
        const pc = peerConnectionRef.current;
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .then(() => console.log('ICE candidate added successfully'))
                .catch((error) => console.error('Error adding ICE candidate:', error));
        } else {
            console.log('Queueing ICE candidate');
            iceCandidatesQueue.current.push(candidate);
        }
    }, []);

    const callPeer = useCallback(() => {
        if (!peerId) {
            alert('Please enter a peer ID or username');
            return;
        }
        peerIdRef.current = peerId;
        const pc = createPeerConnection();

        pc.createOffer()
            .then((offer) => {
                console.log('Created offer:', JSON.stringify(offer));
                return pc.setLocalDescription(offer);
            })
            .then(() => {
                console.log('Local description set (offer)');
                console.log('Sending offer');
                socketRef.current.emit('offer', {
                    offer: pc.localDescription,
                    senderId: userId,
                    receiverId: peerId
                });
            })
            .catch((error) => console.error('Error during call initiation:', error));

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
        connectSocketIO();
        
        // Log network information
        // if (navigator.connection) {
        //     console.log('Network type:', navigator.connection.type);
        //     console.log('Effective network type:', navigator.connection.effectiveType);
        // }

        return () => {
            console.log('Cleaning up Socket.IO and peer connection');
            clearTimeout(connectionTimeoutRef.current);
            peerConnectionRef.current?.close();
            socketRef.current?.disconnect();
            if (ydocRef.current) {
                ydocRef.current.destroy();
            }
        };
    }, [connectSocketIO]);

    useEffect(() => {
        if (
            socketRef.current &&
            socketRef.current.connected &&
            peerIdRef.current &&
            iceCandidatesQueue.current.length > 0
        ) {
            iceCandidatesQueue.current.forEach((candidate) => {
                console.log('Sending queued ICE candidate:', JSON.stringify(candidate));
                socketRef.current.emit('candidate', {
                    candidate,
                    senderId: userId,
                    receiverId: peerIdRef.current
                });
            });
            iceCandidatesQueue.current = [];
        }
    }, [userId]);


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
                        onChange={(e) => setPeerId(e.target.value)}
                        placeholder="Enter peer ID or username"
                        className="peer-input"
                    />
                    <button onClick={callPeer} disabled={callInitiated} className="call-button">
                        Share To
                    </button>

                </div>
            )}
        </div>
    );
}

export default App;