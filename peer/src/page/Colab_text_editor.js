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
import { yCollab } from 'y-codemirror.next'; // Yjs integration for CodeMirror 6

function App() {
 
  const location = useLocation(); // Use the useLocation hook to access location

  

  const ID = location.pathname; // Access pathname directly from location
  const State = location.state;

  const cppEditorRef = useRef(null);
  const jsEditorRef = useRef(null);
  const pythonEditorRef = useRef(null);
  const [editorMode, setEditorMode] = useState('text'); // Manage state for editor mode (text/code)
  const [quill, setQuill] = useState(null);

  const showTextEditor = () => setEditorMode('text');
  const showCodeEditor = () => setEditorMode('code');

  const setCPP = () => setEditorMode('cpp');
  const setJS = () => setEditorMode('js');
  const setPython = () => setEditorMode('python');

  useEffect(() => {
    Quill.register('modules/cursors', QuillCursors);
    if (!quill) {
      const editor = new Quill('#text_box_editor', {
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block']
          ],
          history: {
            userOnly: true
          }
        },
        placeholder: 'Start collaborating...',
        theme: 'snow'
      });
      setQuill(editor);
    }

    if (quill) {
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(`${ID}TEXT`, ydoc);
      const ytext = ydoc.getText('quill');
      new QuillBinding(ytext, quill, provider.awareness);
    }
  }, [quill]);

  useEffect(() => {
    const setupEditor = (element, language, yTextId) => {
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(`${ID}${yTextId}`, ydoc);
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
    };

    if (cppEditorRef.current && editorMode === 'cpp') {
      setupEditor(cppEditorRef.current, cpp(), 'CODE_CPP');
    }

    if (jsEditorRef.current && editorMode === 'js') {
      setupEditor(jsEditorRef.current, javascript(), 'CODE_JS');
    }

    if (pythonEditorRef.current && editorMode === 'python') {
      setupEditor(pythonEditorRef.current, python(), 'CODE_PYTHON');
    }
  }, [editorMode]);

  return (
    <div>
      

      <div>
        <button onClick={showTextEditor}>Text Editor</button>
        {/* <button onClick={showCodeEditor}>Code Editor</button> */}
      </div>

      {editorMode === 'text' && (
        <div id="text_editor">
          <div id="text_box_editor" />
        </div>
      )}

      {editorMode === 'code' && (
        <div id="code_editor">
          <div>
            <button onClick={setCPP}>C++</button>
            <button onClick={setJS}>JavaScript</button>
            <button onClick={setPython}>Python</button>
          </div>
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
      )}
    </div>
  );
}

export default App;