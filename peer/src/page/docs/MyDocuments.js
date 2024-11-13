import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChatState } from '../../context/ChatProvider';

const MyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  // const [loading, setLoading] = useState(true);
  const { token, user } = ChatState(); 

  const userEmail = user?.email;

  console.log(token);
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userEmail) return;
      try {

        
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`, // Include the token in the Authorization header
          },
        };  

        const { data } = await axios.get('/api/document/my-documents', config);

        setDocuments(data);
      } catch (error) {
        console.error('Error fetching documents:', error.response.data);
      } finally {
        // setLoading(false);
      }
    };

    fetchDocuments();
  }, [userEmail]);

  if (!userEmail) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link to="/manage-docs" className="text-blue-600 hover:text-blue-800 mr-4">
          ← Back to Home
        </Link>
        <h1 className="text-2xl font-bold">My Documents</h1>
      </div>

      <ul>
        {documents.length > 0 ? (
          documents.map((doc) => (
            <li key={doc._id} className="mb-4">
              <Link to={`/editor/${doc._id}`} className="text-blue-600 hover:text-blue-800">
                {doc.title || 'Untitled Document'}
              </Link>
            </li>
          ))
        ) : (
          <p>No documents found.</p>
        )}
      </ul>
    </div>
  );
};

export default MyDocuments;
