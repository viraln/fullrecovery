import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '../../utils/articleUtils';

/**
 * Displays a list of related articles
 */
export default function RelatedArticles({ articles = [], title = "Related Articles" }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="mt-10 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <Link 
            href={`/posts/${article.slug}`} 
            key={article.slug || `related-${index}`}
            className="group"
          >
            <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Article Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <Image 
                  src={article.image || '/images/default-article.jpg'} 
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Article Content */}
              <div className="p-4">
                {article.category && (
                  <span className="inline-block text-xs font-medium text-indigo-600 mb-2">
                    {article.category}
                  </span>
                )}
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {article.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{formatDate(article.date)}</span>
                  <span>{article.readingTime || 3} min read</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 