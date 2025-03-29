import React from 'react';
import { FaList } from 'react-icons/fa';

/**
 * Button to toggle the Table of Contents visibility
 */
export default function TOCButton({ onClick, isActive = false }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        isActive 
          ? 'bg-indigo-100 text-indigo-700' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      aria-label="Toggle Table of Contents"
      title="Table of Contents"
    >
      <FaList className="w-5 h-5" />
    </button>
  );
} 