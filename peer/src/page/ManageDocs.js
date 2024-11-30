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
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-white to-blue-100 py-12">
            <div className="max-w-lg w-full mx-auto p-10 bg-white shadow-2xl rounded-3xl border border-gray-200">
                {/* Header */}
                <h2 className="text-3xl font-extrabold text-blue-800 mb-8 text-center">
                    Create New Document
                </h2>
    
                {/* Error Message */}
                {error && (
                    <p className="text-red-500 text-sm mb-4 text-center">
                        {error}
                    </p>
                )}
    
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title Input */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ease-in-out duration-150 placeholder-gray-400"
                            placeholder="Enter document title"
                            required
                        />
                    </div>
    
                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Create Document
                    </button>
                </form>
            </div>
    
            {/* Navigation Links */}
            <div className="mt-10 flex space-x-6">
    <Link
        to="/my-documents"
        className="text-blue-800 font-semibold text-lg py-2 px-6 rounded-full border border-blue-300 shadow-md transition duration-300 ease-in-out transform hover:bg-blue-600 hover:text-white hover:shadow-lg hover:-translate-y-1"
    >
        My Documents
    </Link>
    <Link
        to="/shared-documents"
        className="text-blue-800 font-semibold text-lg py-2 px-6 rounded-full border border-blue-300 shadow-md transition duration-300 ease-in-out transform hover:bg-blue-600 hover:text-white hover:shadow-lg hover:-translate-y-1"
    >
        Shared Documents
    </Link>
</div>
        </div>
    );
};




export default ManageDocument;
