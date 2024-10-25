import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Colab_text_editor from './page/Colab_text_editor';
import HomePage from './page/HomePage';
import UserSpace from './page/UserSpace';
import { ChakraProvider } from '@chakra-ui/react'
import ChatProvider from './context/ChatProvider';

function App() {
  return (
    <ChakraProvider>
      <div className="App">
        <Router>
          <ChatProvider>
            <Routes>
              <Route exact path="/" element={<HomePage />} />
              <Route path="/userspace" element={<UserSpace />} />
              <Route path="/:id" element={<Colab_text_editor />} />
            </Routes>
          </ChatProvider>
        </Router>
      </div>
    </ChakraProvider>
  );
}

export default App;
