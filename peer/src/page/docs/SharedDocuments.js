import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChatState } from '../../context/ChatProvider';

const SharedDocuments = () => {
  const [documents, setDocuments] = useState([]);
  // const [loading, setLoading] = useState(true);
  const { token, user } = ChatState(); 

  const userEmail = user?.email;

  // console.log();
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userEmail) return;
      try {

        
        const config = {
          headers: {
            Authorization: `Bearer ${token}`, // Include the token in the Authorization header
          },
        };  

        const { data } = await axios.get('/api/document/shared-documents', config);

        setDocuments(data);
        console.log(data);
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
    <div className="p-4 sm:p-8 bg-gradient-to-br from-blue-200 via-white to-blue-100 min-h-screen">
    {/* Header Section */}
    <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent text-center sm:text-left">
            Shared With Me
        </h1>
    </div>

    {/* Document List */}
    <div className="bg-white rounded-2xl  shadow-lg p-6 sm:p-8 transform transition hover:scale-[1.01] duration-300">
        {documents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                    <li
                        key={doc._id}
                        className="py-4 flex items-center justify-between group"
                    >
                        <Link
                            to={`/editor/${doc._id}`}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-lg sm:text-xl transition-all duration-300 group-hover:underline truncate"
                        >
                            {doc.title || 'Untitled Document'}
                        </Link>
                        <span className="text-gray-500 text-sm sm:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Shared on: {new Date(doc.sharedAt).toLocaleDateString()}
                        </span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 text-center py-8 text-lg sm:text-xl italic">
                No documents found. Check your shared folder or ask for access!
            </p>
        )}
    </div>
</div>


  );
  };

  export default SharedDocuments;