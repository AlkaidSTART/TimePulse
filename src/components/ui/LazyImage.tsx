import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';

export interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  aspectRatio?: string | number;
  containerClassName?: string;
  fallback?: React.ReactNode;
}

/**
 * High-performance LazyImage component.
 * Combines IntersectionObserver for fine-grained lazy loading,
 * native loading="lazy" + decoding="async", smooth fade-in animations,
 * and layout-shift prevention.
 */
export function LazyImage({
  src,
  alt,
  placeholderSrc,
  aspectRatio,
  className = '',
  containerClassName = '',
  fallback,
  style,
  onLoad,
  onError,
  ...rest
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset status when src changes
    setIsLoaded(false);
    setHasError(false);

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const currentEl = containerRef.current;
    if (!currentEl) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px', // Preload when within 200px of viewport
        threshold: 0.01,
      },
    );

    observer.observe(currentEl);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  // If the image is already cached by the browser, complete might be true immediately
  useEffect(() => {
    if (isInView && imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{
        aspectRatio: aspectRatio !== undefined ? aspectRatio : undefined,
        ...style,
      }}
    >
      {/* Optional placeholder or skeleton */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-black/5 dark:bg-white/5 animate-pulse transition-opacity duration-300"
          style={placeholderSrc ? { backgroundImage: `url(${placeholderSrc})`, backgroundSize: 'cover' } : undefined}
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={(e) => {
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setHasError(true);
            onError?.(e);
          }}
          {...rest}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        fallback ?? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 text-gray-400 text-xs select-none">
            {alt || '加载失败'}
          </div>
        )
      )}
    </div>
  );
}

export default LazyImage;
