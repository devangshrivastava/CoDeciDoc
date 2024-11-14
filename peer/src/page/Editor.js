import { ChatState } from "../context/ChatProvider";
import React, { useState, useRef, useCallback, useEffect } from 'react';

import * as Y from 'yjs';
import './App.css';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { iceServers } from '../config/config';
import useSocket from '../hooks/useSocket';
import {setupDataChannelEvents} from '../utils/dataChannelUtils';


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
  const syncManagerRef = useRef(null);

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
  }, [socketRef, userEmail]);

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
    setupDataChannelEvents({
      dataChannelRef,
      ydocRef,
      ytextRef,
      setText,
    });

    peerConnectionRef.current = pc;

    connectionTimeoutRef.current = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected') {
        console.log('Connection timeout. Restarting ICE...');
        pc.restartIce();
      }
    }, 15000);

    return pc;
  }, [sendIceCandidate]);

  const { connectSocketIO } = useSocket({
    userEmail: userEmail,
    setConnectionStatus: setConnectionStatus,
    setPeerEmail: setPeerEmail,
    peerEmailRef: peerEmailRef,
    setCallInitiated: setCallInitiated,
    socketRef: socketRef,
    createPeerConnection: createPeerConnection,
    dataChannelRef: dataChannelRef,
    setupDataChannelEvents: setupDataChannelEvents,
    ydocRef: ydocRef,
    ytextRef: ytextRef,
    setText: setText,
    peerConnectionRef: peerConnectionRef,
    iceCandidatesQueue: iceCandidatesQueue,
  });

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
  }, [createPeerConnection, userEmail, peerEmail, socketRef]);

  useEffect(() => {
    let cleanup;
    if (dataChannelRef.current) {
      cleanup = setupDataChannelEvents({
        dataChannelRef,
        ydocRef,
        ytextRef,
        setText,
      });
      
    }
    return () => {
      cleanup?.();
    };
  }, []);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    ydocRef.current.transact(() => {
      const ytext = ytextRef.current;
      ytext.delete(0, ytext.length);
      ytext.insert(0, newText);
    }, 'local');
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
  }, [connectSocketIO, socketRef]);


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
  }, [userEmail, socketRef]);


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

        // const ytext = ytextRef.current;
        // ytext.delete(0, ytext.length);  // Clear the current Yjs text content
        // ytext.insert(0, data.content);

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
      {user ? (
        <>
          <div>Status: {connectionStatus}</div>
          <div>Your Email: {userEmail}</div>
          <div>
            <input
              value={peerEmail}
              onChange={(e) => setPeerEmail(e.target.value)}
              placeholder="Enter peer email"
              className="peer-input"
            />
            <button onClick={callPeer} disabled={callInitiated} className="call-button">
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

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
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
        </>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
export default Editor;