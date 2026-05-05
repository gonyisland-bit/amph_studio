import React, { useState, useEffect } from 'react';

interface MediaRendererProps {
  src: string;
  className?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onLoad?: () => void;
  playing?: boolean;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({
  src,
  className = '',
  alt = '',
  loading = 'lazy',
  fetchpriority = 'auto',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  onLoad,
  playing = true
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const isVideo = src.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || src.includes('video');

  useEffect(() => {
    // Reset states when src changes
    setIsLoaded(false);
    setError(false);

    // Check if image is already cached/loaded
    if (!isVideo && imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src, isVideo]);

  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing]);

  if (!src) return <div className={`${className} bg-silver/10`} />;

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={`overflow-hidden ${className.includes('absolute') ? '' : 'relative'} ${className}`}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 shimmer bg-silver/10 z-0" />
      )}
      
      {isVideo ? (
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          onLoadedData={handleLoad}
          onCanPlay={handleLoad}
          onError={() => setError(true)}
        />
      ) : (
        <img
          ref={imgRef}
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          alt={alt}
          loading={loading}
          // @ts-ignore
          fetchpriority={fetchpriority}
          onLoad={handleLoad}
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-silver/10 text-ink/20 text-[10px] font-bold uppercase">
          Media unavailable
        </div>
      )}
    </div>
  );
};
