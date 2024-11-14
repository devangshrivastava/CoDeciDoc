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
        <div className="flex flex-col items-center min-h-screen bg-gray-100 py-10">
        <div className="max-w-md w-full mx-auto p-8 bg-white shadow-lg rounded-lg">
            {/* Header */}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
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
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Document Title
                    </label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ease-in-out duration-150"
                        placeholder="Enter document title"
                        required
                    />
                </div>
    
                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                >
                    Create Document
                </button>
            </form>
        </div>
    
        {/* Navigation Links */}
        <div className="mt-8 flex space-x-6">
            <Link
                to="/my-documents"
                className="text-blue-600 font-semibold hover:text-blue-800 transition duration-150 ease-in-out"
            >
                My Documents
            </Link>
            <Link
                to="/shared-documents"
                className="text-blue-600 font-semibold hover:text-blue-800 transition duration-150 ease-in-out"
            >
                Shared Documents
            </Link>
        </div>
    </div>
    
    );
};




export default ManageDocument;
