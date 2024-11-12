import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// import Colab_text_editor from './page/Colab_text_editor';
import HomePage from './page/HomePage';
// import UserSpace from './page/UserSpace';
import { ChakraProvider } from '@chakra-ui/react'
import ChatProvider from './context/ChatProvider';
import ManageDocs from './page/ManageDocs';
import MyDocuments from './page/docs/MyDocuments';
import NewDocument from './page/docs/NewDocument';
import SharedDocuments from './page/docs/SharedDocuments';
import Editor from './page/Editor';


function App() {
  return (
    <ChakraProvider>
      <div className="App">
        <Router>
          <ChatProvider>
            <Routes>
              <Route exact path="/" element={<HomePage />} />
              {/* <Route path="/userspace" element={<UserSpace />} />
              <Route path="/:id" element={<Colab_text_editor />} /> */}
              <Route path="/manage-docs" element={<ManageDocs />} />
              <Route path="/my-documents" element={<MyDocuments />} />
              <Route path="/new-document" element={<NewDocument />} />
              <Route path="/shared-documents" element={<SharedDocuments />} />
              <Route path="/editor/:id" element={<Editor />} />
            </Routes>
          </ChatProvider>
        </Router>
      </div>
    </ChakraProvider>
  );
}

export default App;
