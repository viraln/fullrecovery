import React from 'react';

/**
 * Displays a table of contents for an article
 */
export default function TableOfContents({ 
  items = [], 
  activeId = '', 
  onItemClick,
  isMobile = false,
  isVisible = true
}) {
  if (!items || items.length === 0) return null;
  
  // Don't render if it's not visible (used for mobile TOC)
  if (isMobile && !isVisible) return null;

  return (
    <div className={`
      ${isMobile 
        ? 'fixed inset-0 z-50 bg-white p-4 overflow-y-auto' 
        : 'sticky top-24 max-h-screen overflow-y-auto pb-8 pr-4'
      } ${!isVisible && 'hidden'}
    `}>
      {isMobile && (
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h3 className="text-lg font-bold">Table of Contents</h3>
          <button 
            onClick={() => onItemClick && onItemClick(null, true)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      )}
      
      {!isMobile && (
        <h3 className="text-lg font-bold mb-4">Table of Contents</h3>
      )}
      
      <nav>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="pl-2">
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onItemClick && onItemClick(item.id, false);
                }}
                className={`
                  block py-1 text-sm border-l-2 pl-3 -ml-2
                  hover:text-indigo-600 hover:border-indigo-600
                  transition-colors duration-200
                  ${activeId === item.id 
                    ? 'text-indigo-600 border-indigo-600 font-medium' 
                    : 'text-gray-600 border-gray-200'
                  }
                `}
              >
                {item.text}
              </a>
              
              {/* Render nested items if any */}
              {item.items && item.items.length > 0 && (
                <ul className="pl-4 mt-1 space-y-1">
                  {item.items.map((subItem) => (
                    <li key={subItem.id}>
                      <a
                        href={`#${subItem.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onItemClick && onItemClick(subItem.id, false);
                        }}
                        className={`
                          block py-1 text-xs border-l-2 pl-3 -ml-2
                          hover:text-indigo-600 hover:border-indigo-600
                          transition-colors duration-200
                          ${activeId === subItem.id 
                            ? 'text-indigo-600 border-indigo-600 font-medium' 
                            : 'text-gray-600 border-gray-200'
                          }
                        `}
                      >
                        {subItem.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
} 