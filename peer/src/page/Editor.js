import { ChatState } from "../context/ChatProvider";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import './App.css';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { iceServers, SOCKET_URL } from '../config/config';
// import { createPeerConnection } from '../utils/peerConnetion';


function Editor() {
  const [peerEmail, setPeerEmail] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [callInitiated, setCallInitiated] = useState(false);
  const [text, setText] = useState('');

  const [collaborators, setCollaborators] = useState([]); // For listing current collaborators
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState(''); // For adding a new collaborator
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // For showing save status messages

  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const dataChannelRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const ydocRef = useRef(new Y.Doc()); // Initialize Yjs document immediately
  const ytextRef = useRef(ydocRef.current.getText('shared')); // Shared text in Yjs
  const peerEmailRef = useRef('');
  const connectionTimeoutRef = useRef(null);
  const { user } = ChatState();
  const userEmail = user?.email;
  const { id } = useParams();


  // Prevent further execution if user is not yet loaded

  
  
  const connectSocketIO = useCallback(() => {
    if (!userEmail) return;
    if(!collaborators) return;
    // socketRef.current = io('http://172.31.104.87:4444');
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

      const { senderEmail} = message;
      const isAuthorized =
        userEmail === senderEmail || // Owner of the document
        collaborators.some(collab => collab.email === senderEmail);

        // if (!isAuthorized) {
        //   socketRef.current.emit('authorizationError', {
        //     message: 'Not an authorized user',
        //     senderEmail: userEmail,
        //     receiverEmail: senderEmail
        //   });
        //   console.log('User not authorized');
        //   return;
        // }

      console.log(`Offer received from ${message.senderEmail}`);
      setPeerEmail(message.senderEmail);
      peerEmailRef.current = message.senderEmail;
      handleOffer(message);
      setCallInitiated(true);
    });

    socketRef.current.on('authorizationError', (message) => {
      alert('You are not authorized to access this document');
      console.error('Authorization error:', message.message);
    });

    socketRef.current.on('answer', (message) => {
      console.log(`Answer received from ${message.senderEmail}`);
      setPeerEmail(message.senderEmail);
      handleAnswer(message);
      setCallInitiated(true);
    });

    socketRef.current.on('candidate', (message) => {
      console.log(`ICE candidate received from ${message.senderEmail}:`, JSON.stringify(message.candidate));
      handleCandidate(message);
    });

    socketRef.current.on('errorMessage', (error) => {
      console.error('Error from server:', error.message);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }, [userEmail]);

  const sendIceCandidate = useCallback((candidate) => {
    if (socketRef.current && socketRef.current.connected && peerEmailRef.current) {
      console.log('Sending ICE candidate:', JSON.stringify(candidate));
      socketRef.current.emit('candidate', {
        candidate,
        senderEmail: userEmail,
        receiverEmail: peerEmailRef.current
      });
    } else {
      console.log('Queueing ICE candidate:', JSON.stringify(candidate));
      iceCandidatesQueue.current.push(candidate);
    }
  }, [userEmail]);




  const createPeerConnection = useCallback(() => {
    console.log('Creating peer connection');
    const pc = new RTCPeerConnection({
      iceServers,
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

    connectionTimeoutRef.current = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected') {
        console.log('Connection timeout. Restarting ICE...');
        pc.restartIce();
      }
    }, 15000);

    return pc;
  }, [sendIceCandidate]);

  const setupDataChannelEvents = () => {
    if (!dataChannelRef.current) return;

    dataChannelRef.current.onopen = () => {
      console.log('Data channel is open');
      
      // Set up Yjs awareness and update handlers
      ydocRef.current.on('update', (update) => {
        if (dataChannelRef.current?.readyState === 'open') {
          console.log('Sending Yjs update:', update);
          dataChannelRef.current.send(
            JSON.stringify({
              type: 'yjsUpdate',
              update: Array.from(update)
            })
          );
        }
      });

      // Send initial state when connection opens
      const initialUpdate = Y.encodeStateAsUpdate(ydocRef.current);
      dataChannelRef.current.send(
        JSON.stringify({
          type: 'yjsUpdate',
          update: Array.from(initialUpdate)
        })
      );
    };

    dataChannelRef.current.onmessage = (event) => {
      console.log('Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'yjsUpdate') {
          // Convert array back to Uint8Array
          const update = new Uint8Array(data.update);
          Y.applyUpdate(ydocRef.current, update);
          
          // Update the text state to reflect changes
          setText(ytextRef.current.toString());
        }
      } catch (error) {
        console.error('Error processing received message:', error);
      }
    };

    dataChannelRef.current.onclose = () => {
      console.log('Data channel closed');
    };

    dataChannelRef.current.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  };

  // const syncInitialText = () => {
  //   if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
  //     const initialUpdate = Y.encodeStateAsUpdate(ydocRef.current);
  //     dataChannelRef.current.send(
  //       JSON.stringify({ type: 'yjsUpdate', update: Array.from(initialUpdate) })
  //     );
  //   }
  // };

  const handleSave = async () => {
    if (!text.trim()) {
      setSaveStatus('Nothing to save');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.put(`/api/document/${id}`, {
        content: text
      }, config);

      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus(error.response?.data?.message || 'Error saving document');
      setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOffer = useCallback(({ offer, senderEmail }) => {
    setPeerEmail(senderEmail);
    peerEmailRef.current = senderEmail;
    const pc = createPeerConnection();

    pc.ondatachannel = (event) => {
      dataChannelRef.current = event.channel;
      setupDataChannelEvents();
    };

    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => {
        socketRef.current.emit('answer', {
          answer: pc.localDescription,
          senderEmail: userEmail,
          receiverEmail: peerEmailRef.current
        });
      })
      .catch((error) => console.error('Error during offer handling:', error));
  }, [createPeerConnection, userEmail]);

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
    if (!peerEmail) {
      alert('Please enter a peer email');
      return;
    }
    peerEmailRef.current = peerEmail;
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
          senderEmail: userEmail,
          receiverEmail: peerEmailRef.current,
          documentId: id
        });
      })
      .catch((error) => console.error('Error during call initiation:', error));

    setCallInitiated(true);
  }, [createPeerConnection, userEmail, peerEmail]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    // if (ytextRef.current) {
      ytextRef.current.delete(0, ytextRef.current.length);
      ytextRef.current.insert(0, newText);
    // }
  };

  useEffect(() => {
    // Initialize Yjs observers
    const observer = () => {
      const newText = ytextRef.current.toString();
      if (text !== newText) {
        setText(newText);
      }
    };

    ytextRef.current.observe(observer);

    // Set up WebRTC connection
    connectSocketIO();

    return () => {
      ytextRef.current.unobserve(observer);
      clearTimeout(connectionTimeoutRef.current);
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      ydocRef.current.destroy();
    };
  }, [connectSocketIO]);


  useEffect(() => {
    if (!userEmail) return;
    if (
      socketRef.current &&
      socketRef.current.connected &&
      peerEmailRef.current &&
      iceCandidatesQueue.current.length > 0
    ) {
      iceCandidatesQueue.current.forEach((candidate) => {
        console.log('Sending queued ICE candidate:', JSON.stringify(candidate));
        socketRef.current.emit('candidate', {
          candidate,
          senderEmail: userEmail,
          receiverEmail: peerEmailRef.current
        });
      });
      iceCandidatesQueue.current = [];
    }
  }, [userEmail]);


  useEffect(() => {
    if (!userEmail) return;
    const fetchCollaborators = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`, // Include the token in the Authorization header
          },
        };  

        const { data } = await axios.get(`/api/document/${id}`, config); // Update the endpoint as needed
        setText(data.content);
        setCollaborators(data.collaborators);
        console.log('Collaborators:', data.collaborators);
        
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      }
    };
    
    fetchCollaborators();
  }, [id, userEmail]);

  const addCollaborator = async () => {
    try {

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`, // Include the token in the Authorization header
        },
      };  

      const { data } = await axios.put(`/api/document/${id}/collaborator`, {
        collaborator: newCollaboratorEmail,
        },
        config
      );
      
      setCollaborators(data.collaborators);
      setNewCollaboratorEmail('');
    } catch (error) {
      console.error('Error adding collaborator:', error);
      alert(error.response?.data?.message || 'Failed to add collaborator');
    }
  };

  if (!user) {
    return <div>Loading...</div>; // Show loading indicator only in the render phase
  }

  return (
    <div className="app-container">
      <div>Status: {connectionStatus}</div>
      <div>Your Email: {userEmail}</div>
      <div>
        <input
          value={peerEmail}
          onChange={(e) => setPeerEmail(e.target.value)}
          placeholder="Enter peer email"
          className="peer-input"
        />
        <button 
          onClick={callPeer} 
          disabled={callInitiated} 
          className="call-button"
        >
          Connect
        </button>
      </div>

      <div className="editor-container" style={{ position: 'relative', marginTop: '20px' }}>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Start typing..."
          style={{ width: '100%', height: '300px', marginBottom: '10px' }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: isSaving ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Document'}
          </button>
          
          {saveStatus && (
            <div
              style={{
                marginLeft: '10px',
                color: saveStatus.includes('Error') ? '#f44336' : '#4CAF50',
              }}
            >
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* Collaborator Section */}
      <div className="collaborator-section">
        <h3>Shared With:</h3>
        <ul>
          {collaborators.map((collaborator) => (
            <li key={collaborator.userId.toString()}>{collaborator.email}</li>
          ))}
        </ul>

        <input
          type="email"
          value={newCollaboratorEmail}
          onChange={(e) => setNewCollaboratorEmail(e.target.value)}
          placeholder="Add collaborator email"
        />
        <button onClick={addCollaborator}>Add Collaborator</button>
      </div>
    </div>
  );
}

export default Editor;