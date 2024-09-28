import React from 'react'
import { useNavigate } from 'react-router-dom';
import { v1 as uuidv1 } from 'uuid';

function HomePage() {
    const navigate = useNavigate();
    function new_editor() {
        let new_id = uuidv1();
        navigate("/" + new_id);
      }

  return (
    <div>
      <div>
        <h1>Hello Welcome To Collaborative Text Editor</h1>
        <button onClick={new_editor}>Create New Collaborative Document</button>
      </div>
    </div>
  )
}

export default HomePage
