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

  useEffect(() => {
    // Reset states when src changes
    setIsLoaded(false);
    setError(false);
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Auto-play might be blocked by browser if not muted, 
          // but we usually default to muted.
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing]);

  if (!src) return <div className={`${className} bg-silver/10`} />;

  const isVideo = src.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || src.includes('video');

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
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
