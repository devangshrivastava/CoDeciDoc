import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Colab_text_editor from './page/Colab_text_editor';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Colab_text_editor />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
