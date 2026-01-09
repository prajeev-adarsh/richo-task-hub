import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  aspectRatio = 'auto',
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'overflow-hidden bg-muted',
        aspectClasses[aspectRatio],
        className
      )}
    >
      {isInView && (
        <img
          src={hasError ? fallback : src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
      {(!isInView || !isLoaded) && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
    </div>
  );
};

export default OptimizedImage;
