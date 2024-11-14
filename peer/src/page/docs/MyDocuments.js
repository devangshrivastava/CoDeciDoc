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
    <div className="p-8 bg-gray-50 min-h-screen">
    {/* Header Section with Navigation */}
    <div className="flex items-center mb-8">
        <Link to="/manage-docs" className="text-blue-600 hover:text-blue-800 mr-6 text-lg">
            ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
            My Documents
        </h1>
    </div>

    {/* Document List */}
    <div className="bg-white rounded-lg shadow-md p-6">
        {documents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                    <li key={doc._id} className="py-4">
                        <Link
                            to={`/editor/${doc._id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                        >
                            {doc.title || 'Untitled Document'}
                        </Link>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 text-center">No documents found.</p>
        )}
    </div>
</div>

  );
};

export default MyDocuments;
