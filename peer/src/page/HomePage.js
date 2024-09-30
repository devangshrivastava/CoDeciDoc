import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v1 as uuidv1 } from 'uuid';

// Styles
const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#f0f2f5',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const boxStyle = {
  textAlign: 'center',
  backgroundColor: '#fff',
  padding: '40px',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
};

const titleStyle = {
  fontSize: '2.5rem',
  color: '#333',
  marginBottom: '20px',
};

const buttonStyle = {
  backgroundColor: '#007BFF',
  color: '#fff',
  fontSize: '1rem',
  padding: '10px 20px',
  borderRadius: '5px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const buttonHoverStyle = {
  backgroundColor: '#0056b3',
};

function HomePage() {
  const navigate = useNavigate();
  const [buttonHover, setButtonHover] = React.useState(false);

  function new_editor() {
    let new_id = uuidv1();
    navigate('/' + new_id);
  }

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h1 style={titleStyle}>Welcome To Collaborative Text Editor</h1>
        <button
          style={buttonHover ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
          onClick={new_editor}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
        >
          Create New Collaborative Document
        </button>
      </div>
    </div>
  );
}

export default HomePage;
