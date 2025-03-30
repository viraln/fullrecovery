import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '../../utils/articleUtils';

const ArticleHeader = ({ frontMatter, readingTime }) => {
  const {
    title,
    date,
    author,
    category,
    image,
    imageAlt,
    imageCredit
  } = frontMatter;

  return (
    <header className="article-header">
      {/* Category */}
      {category && (
        <div className="category">
          <Link 
            href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
            className="category-link"
          >
            {category}
          </Link>
        </div>
      )}

      {/* Title */}
      <h1 className="title">{title}</h1>

      {/* Metadata row */}
      <div className="metadata">
        {/* Date */}
        {date && (
          <div className="date">
            {formatDate(date)}
          </div>
        )}

        {/* Reading time */}
        {readingTime && (
          <div className="reading-time">
            <span className="dot">·</span>
            {readingTime} min read
          </div>
        )}

        {/* Author */}
        {author && (
          <div className="author">
            <span className="dot">·</span>
            By <span className="author-name">{author}</span>
          </div>
        )}
      </div>

      {/* Featured Image */}
      {image && (
        <div className="featured-image-container">
          <div className="image-wrapper">
            <Image
              src={image}
              alt={imageAlt || title}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
              className="featured-image"
            />
          </div>
          {imageCredit && (
            <div className="image-credit">
              Credit: {imageCredit}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .article-header {
          margin-bottom: 2rem;
        }
        .category {
          margin-bottom: 0.75rem;
        }
        .category-link {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background-color: #f0f0f0;
          color: #444;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        .category-link:hover {
          background-color: #e0e0e0;
        }
        .title {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .metadata {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          color: #6c757d;
        }
        .dot {
          margin: 0 0.5rem;
        }
        .author-name {
          font-weight: 500;
        }
        .featured-image-container {
          position: relative;
          width: 100%;
          margin-bottom: 1.5rem;
        }
        .image-wrapper {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          border-radius: 8px;
          overflow: hidden;
        }
        .image-credit {
          text-align: right;
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: 0.5rem;
        }
        @media (max-width: 768px) {
          .title {
            font-size: 2rem;
          }
        }
      `}</style>
    </header>
  );
};

export default ArticleHeader; 