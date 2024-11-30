import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import ColabTextEditor from './page/Colab_text_editor';
import HomePage from './page/HomePage';
import { ChakraProvider } from '@chakra-ui/react';
import ChatProvider from './context/ChatProvider';
import ManageDocs from './page/ManageDocs';
import MyDocuments from './page/docs/MyDocuments';
import SharedDocuments from './page/docs/SharedDocuments';
import Editor from './page/Editor';
import Nav from './components/Navigation/Nav';

function App() {
  return (
    <ChakraProvider>
      <div className="App">
        <Router>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </Router>
      </div>
    </ChakraProvider>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <>
      {location.pathname !== '/' && <Nav />}
      <Routes>
        <Route exact path="/" element={<HomePage />} />
        <Route path="/:id" element={<ColabTextEditor />} />
        <Route path="/manage-docs" element={<ManageDocs />} />
        <Route path="/my-documents" element={<MyDocuments />} />
        <Route path="/shared-documents" element={<SharedDocuments />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </>
  );
}

export default App;
