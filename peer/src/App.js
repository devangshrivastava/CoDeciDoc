import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Colab_text_editor from './page/Colab_text_editor';
import HomePage from './page/HomePage';


function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route exact path="/" element={<HomePage />} />
          <Route path="/:id" element={<Colab_text_editor />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
