import { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * LazyImage component with progressive loading and blur-up effect
 * Only loads images when they're near the viewport
 */
export default function LazyImage({
  src,
  alt,
  width = 800,
  height = 500,
  className = '',
  priority = false,
  quality = 75,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [imageRef, setImageRef] = useState(null);

  // Use a simple blur data URL that works client-side
  const placeholderBlur = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3C/filter%3E%3Crect filter='url(%23b)' x='0' y='0' width='100%25' height='100%25' fill='%23F3F4F6'/%3E%3C/svg%3E";

  // Initialize intersection observer
  useEffect(() => {
    if (!imageRef || priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '200px' } // Load images 200px before they come into view
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) observer.unobserve(imageRef);
    };
  }, [imageRef, priority]);

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      ref={setImageRef}
      style={{ aspectRatio: `${width}/${height}` }}
    >
      {(isIntersecting || priority) && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          blurDataURL={placeholderBlur}
          className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoadingComplete={() => setIsLoading(false)}
          {...props}
        />
      )}
      
      {/* Simple placeholder until image loads */}
      {(!isIntersecting && !priority) && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ aspectRatio: `${width}/${height}` }}
        />
      )}
    </div>
  );
} 