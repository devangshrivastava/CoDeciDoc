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
    <div className="p-4 sm:p-8 bg-gradient-to-br from-blue-200 via-white to-blue-100 min-h-screen">
    {/* Header Section with Navigation */}
    <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent text-center sm:text-left">
            My Documents
        </h1>
    </div>

    {/* Document List */}
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 transform transition hover:scale-[1.01] duration-300">
        {documents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                    <li
                        key={doc._id}
                        className="py-4 flex items-center justify-between group"
                    >
                        <Link
                            to={`/editor/${doc._id}`}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-lg sm:text-xl transition-all duration-300 group-hover:underline"
                        >
                            {doc.title || 'Untitled Document'}
                        </Link>
                        <span className="text-gray-500 text-sm sm:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Last edited: {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 text-center py-8 text-lg sm:text-xl italic">
                No documents found. Start by creating a new document!
            </p>
        )}
    </div>
</div>

  );
};

export default MyDocuments;
