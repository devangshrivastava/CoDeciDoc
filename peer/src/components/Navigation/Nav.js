import React from 'react'
import { useNavigate } from 'react-router-dom'

import {ChatState} from '../../context/ChatProvider';

const Nav = () => {
    const navigate = useNavigate();
    const { user } = ChatState();
    console.log(user);

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        
        <div className="text-white font-semibold text-lg flex items-center">
          {/* Set icon color to white */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
            viewBox="0 0 24 24"
            width="24px"
            height="24px"
            cursor={'pointer'}
            onClick={() => navigate('/manage-docs')}
          >
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className='pl-2'>{user?.name}</span>
        </div>

        <button
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          type="button"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Nav
