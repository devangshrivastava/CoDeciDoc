// ManageDocument.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import { useNavigate } from 'react-router-dom';

const ManageDocument = () => {
    const [title, setTitle] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { token, user } = ChatState(); 
    console.log(token);
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            
            let content = "";
            const response = await axios.post('/api/document/', { title, user, content}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.status === 201) {
                navigate(`/editor/${response.data._id}`); // Redirect to the editor with the document ID
            }
        } catch (error) {
            setError('Failed to create document. Please try again.');
            console.error(error);
        }
    };

    return (
        <div>
          <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md">
              <h2 className="text-2xl font-bold mb-4">Create New Document</h2>
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                      <label className="block text-gray-700 font-bold mb-2">Title</label>
                      <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          required
                      />
                  </div>
                  <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                      Create Document
                  </button>
              </form> 
          </div>
          <Link to="/my-documents" className="text-blue-600 hover:text-blue-800 mr-4">
            My Documents
          </Link>
          <Link to="/shared-documents" className="text-blue-600 hover:text-blue-800 mr-4">
            Shared Documents
          </Link>
        </div>
    );
};




export default ManageDocument;
