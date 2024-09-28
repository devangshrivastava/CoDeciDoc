import './App.css';
import Quill from 'quill';
import './quill_snow.css';
import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import { WebrtcProvider } from 'y-webrtc';
import QuillCursors from 'quill-cursors';
import { useLocation } from 'react-router-dom';
import { EditorView, basicSetup } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { yCollab } from 'y-codemirror.next';

const signalingServerUrl = process.env.REACT_APP_SIGNALING_SERVER_URL || 'ws://localhost:4444';

function App() {
  const location = useLocation();
  const ID = location.pathname;
  const cppEditorRef = useRef(null);
  const jsEditorRef = useRef(null);
  const pythonEditorRef = useRef(null);
  const [editorMode, setEditorMode] = useState('text');
  const [quill, setQuill] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [signalingServer, setSignalingServer] = useState(null);

  const reconnectInterval = 5000;

  const showTextEditor = () => setEditorMode('text');
  const setCPP = () => setEditorMode('cpp');
  const setJS = () => setEditorMode('js');
  const setPython = () => setEditorMode('python');

  const connectToSignalingServer = () => {
    const signaling = new WebSocket(signalingServerUrl);
    setSignalingServer(signaling);

    signaling.onopen = () => {
      console.log('Connected to signaling server');
    };

    signaling.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleSignalingMessage(data);
    };

    signaling.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    signaling.onclose = () => {
      console.log('Disconnected from signaling server');
      setTimeout(() => {
        console.log('Attempting to reconnect to signaling server...');
        connectToSignalingServer();
      }, reconnectInterval);
    };
  };

  useEffect(() => {
    connectToSignalingServer();

    return () => {
      if (signalingServer) {
        signalingServer.close();
      }
    };
  }, []);

  const handleSignalingMessage = (data) => {
    if (data.type === 'offer') {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      createAnswer(data.senderId);
    } else if (data.type === 'answer') {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate') {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingServer.send(
          JSON.stringify({
            type: 'candidate',
            candidate: event.candidate,
            receiverId: peerId,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      // Handle incoming track
    };

    pc.onerror = (error) => {
      console.error('PeerConnection error:', error);
    };

    setPeerConnection(pc);
    return pc;
  };

  const createOffer = (peerId) => {
    const pc = createPeerConnection(peerId);
    pc.createOffer()
      .then((offer) => {
        return pc.setLocalDescription(offer);
      })
      .then(() => {
        signalingServer.send(
          JSON.stringify({
            type: 'offer',
            offer: pc.localDescription,
            senderId: ID,
            receiverId: peerId,
          })
        );
      })
      .catch((error) => {
        console.error('Error creating offer:', error);
      });
  };

  const createAnswer = (peerId) => {
    peerConnection.createAnswer()
      .then((answer) => {
        return peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        signalingServer.send(
          JSON.stringify({
            type: 'answer',
            answer: peerConnection.localDescription,
            senderId: ID,
            receiverId: peerId,
          })
        );
      })
      .catch((error) => {
        console.error('Error creating answer:', error);
      });
  };

  useEffect(() => {
    Quill.register('modules/cursors', QuillCursors);
    if (!quill) {
      const editor = new Quill('#text_box_editor', {
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
          ],
          history: {
            userOnly: true,
          },
        },
        placeholder: 'Start collaborating...',
        theme: 'snow',
      });
      setQuill(editor);
    }

    if (quill) {
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(`${ID}TEXT`, ydoc, {
        signaling: [signalingServerUrl],
      });
      const ytext = ydoc.getText('quill');
      new QuillBinding(ytext, quill, provider.awareness);

      return () => {
        provider.disconnect();
        ydoc.destroy();
      };
    }
  }, [quill, ID]);

  useEffect(() => {
    const setupEditor = (element, language, yTextId) => {
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(`${ID}${yTextId}`, ydoc, {
        signaling: [signalingServerUrl],
      });
      const ytext = ydoc.getText(yTextId);

      const view = new EditorView({
        doc: ytext.toString(),
        extensions: [
          basicSetup,
          language,
          yCollab(ytext, provider.awareness),
        ],
        parent: element,
      });

      ydoc.on('update', (update) => {
        const editorState = view.state.doc.toString();
        ytext.applyUpdate(update);
      });

      return () => {
        provider.disconnect();
        ydoc.destroy();
        view.destroy();
      };
    };

    let cleanup;

    if (cppEditorRef.current && editorMode === 'cpp') {
      cleanup = setupEditor(cppEditorRef.current, cpp(), 'CODE_CPP');
    }

    if (jsEditorRef.current && editorMode === 'js') {
      cleanup = setupEditor(jsEditorRef.current, javascript(), 'CODE_JS');
    }

    if (pythonEditorRef.current && editorMode === 'python') {
      cleanup = setupEditor(pythonEditorRef.current, python(), 'CODE_PYTHON');
    }

    return cleanup;
  }, [editorMode, ID]);

  return (
    <div>
      <div>
        <button onClick={showTextEditor}>Text Editor</button>
        <button onClick={setCPP}>C++</button>
        <button onClick={setJS}>JavaScript</button>
        <button onClick={setPython}>Python</button>
      </div>

      {editorMode === 'text' && (
        <div id="text_editor">
          <div id="text_box_editor" />
        </div>
      )}

      {editorMode === 'cpp' && (
        <div id="cpp_editor">
          <h1>Mode: C++</h1>
          <div ref={cppEditorRef} />
        </div>
      )}

      {editorMode === 'js' && (
        <div id="javascript_editor">
          <h1>Mode: JavaScript</h1>
          <div ref={jsEditorRef} />
        </div>
      )}

      {editorMode === 'python' && (
        <div id="python_editor">
          <h1>Mode: Python</h1>
          <div ref={pythonEditorRef} />
        </div>
      )}
    </div>
  );
}

export default App;