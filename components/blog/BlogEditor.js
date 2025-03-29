import React, { useState } from 'react';

/**
 * A simple editor component for blog posts (placeholder for now)
 */
export default function BlogEditor({ initialContent = '', readOnly = true, onSave }) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  
  // If read-only and not editing, return null
  if (readOnly && !isEditing) return null;

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 my-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {isEditing ? 'Edit Content' : 'Content Editor'}
        </h3>
        
        {!readOnly && (
          <div className="space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>
      
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Write your content here..."
        />
      ) : (
        <div className="prose max-w-none">
          {/* In a real implementation, you'd render markdown here */}
          <p>{content || "No content available."}</p>
        </div>
      )}
    </div>
  );
} 