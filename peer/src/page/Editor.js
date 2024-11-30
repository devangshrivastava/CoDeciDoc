import { ChatState } from "../context/ChatProvider";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import './App.css';
import 'quill/dist/quill.snow.css'; // Import Quill's Snow theme CSS

import { useParams } from 'react-router-dom';
import axios from 'axios';
import { iceServers } from '../config/config';
import useSocket from '../hooks/useSocket';
import {setupDataChannelEvents} from '../utils/dataChannelUtils';
import { IndexeddbPersistence } from 'y-indexeddb'
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import QuillCursors from 'quill-cursors';



Quill.register('modules/cursors', QuillCursors);

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

  const quillInstanceRef = useRef(null); // Quill instance reference
  const persistenceRef = useRef(null);


  const peerEmailRef = useRef('');
  const connectionTimeoutRef = useRef(null);
  const { user } = ChatState();
  const userEmail = user?.email;
  const { id } = useParams();
  const [showCollaboratorForm, setShowCollaboratorForm] = useState(false);
  
  // const persistence = new IndexeddbPersistence(roomName, ydoc);

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

      if (persistenceRef.current) {
        persistenceRef.current.destroy();
      }

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
        setText(data.content);
        setCollaborators(data.collaborators);
        console.log('Collaborators:', data.collaborators);

        
        
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      }
    };
    
    fetchCollaborators();
  }, [id, userEmail]);



  useEffect(() => {
    if (!user || !id) return;

    const editorElement = document.getElementById('quill-editor');
    if (!editorElement) return;

    // Initialize Quill editor
    const quill = new Quill(editorElement, {
      theme: 'snow',
      modules: {
        cursors: true, // Collaborative cursors
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          ['code-block', 'image']
        ],
        history: {
          userOnly: true // Prevent undo-redo conflicts with remote users
        }
      },
      placeholder: 'Start collaborating...'
    });

    quillInstanceRef.current = quill;

    // Bind Yjs text to Quill using QuillBinding
    const binding = new QuillBinding(ytextRef.current, quill);

    // IndexedDB Persistence for local storage
    persistenceRef.current = new IndexeddbPersistence('y-quill-doc', ydocRef.current);
    return () => {
      // Cleanup
      binding.destroy();
      persistenceRef.current.destroy();
      ydocRef.current.destroy();
    };
  }, [id, user]); 

  
  

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
    <div className="app-container bg-gray-50 min-h-screen flex flex-col items-center py-10 px-4 sm:px-8 font-sans">
  {user ? (
    <>
      {/* Status Section */}
      <div className="w-full max-w-xs mb-8">
  {/* Status Display */}
  <div className="flex items-center justify-center border-2 border-blue-300 bg-blue-100 text-blue-900 font-medium px-6 py-3 rounded-lg shadow-md mb-4">
    <span className="text-lg font-bold pr-2">Status:</span>
    <span>{connectionStatus}</span>
  </div>

  {/* Peer Email Input and Connect Button */}
  <div className="flex flex-col space-y-4">
    <input
      value={peerEmail}
      onChange={(e) => setPeerEmail(e.target.value)}
      placeholder="Enter peer email"
      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
    />
    <button
      onClick={callPeer}
      disabled={callInitiated}
      className={`w-full py-2 rounded-lg font-semibold text-white transition ${
        callInitiated ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
      }`}
    >
      Connect
    </button>
  </div>
</div>


      {/* Main Content: Editor and Collaborators */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Editor Section */}
        <div className="editor-container col-span-2 bg-white rounded-3xl shadow-xl p-8 border-2 border-blue-200">
          <h3
            className=" mb-6 text-3xl sm:text-4xl font-extrabold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent text-center sm:text-left"
          >
            Editor
          </h3>
          <div id="quill-editor" className="quill-editor"></div>
          <div className="flex justify-between items-center">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-8 py-3 rounded-lg text-white font-semibold text-lg transition ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-lg'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Document'}
            </button>
            {saveStatus && (
              <div
                className={`text-sm font-medium ${
                  saveStatus.includes('Error') ? 'text-red-500' : 'text-blue-600'
                }`}
              >
                {saveStatus}
              </div>
            )}
          </div>
        </div>

        {/* Collaborator Section */}
        <div className="collaborator-section bg-white rounded-3xl shadow-xl p-6">
          <h3
            className="mb-4 text-2xl  font-extrabold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent text-center sm:text-left"
          >
            Shared With
          </h3>
          <ul className="list-disc list-inside space-y-4 mb-6 text-gray-700">
            {collaborators.map((collaborator) => (
              <li key={collaborator.userId.toString()} className="text-gray-600">
                {collaborator.email}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowCollaboratorForm((prev) => !prev)}
            className="px-6 py-3 w-full rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg transition"
          >
            {showCollaboratorForm ? 'Close Form' : 'Add Collaborator'}
          </button>

          {/* Add Collaborator Form */}
          {showCollaboratorForm && (
            <div className="mt-6">
              <input
                type="email"
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                placeholder="Collaborator email"
                className="w-full px-4 py-3 border border-blue-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300 focus:outline-none mb-4"
              />
              <button
                onClick={addCollaborator}
                className="px-6 py-3 w-full rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg transition"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  ) : (
    <div className="text-center text-gray-700 text-lg font-medium">Loading...</div>
  )}
</div>



  );
}
export default Editor;