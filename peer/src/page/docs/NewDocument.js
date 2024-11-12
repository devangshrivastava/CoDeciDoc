import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';

const NewDocument = () => {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link to="/manage-docs" className="text-blue-600 hover:text-blue-800 mr-4">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold">Create New Document</h1>
        </div>
        {/* Add your new document creation component here */}
      </div>
    );
  };

export default NewDocument;