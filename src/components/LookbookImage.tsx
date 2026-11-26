import { useState } from 'react';

interface LookbookImageProps {
  src: string;
  alt: string;
  fallbackLabel?: string;
  className?: string;
}

export function LookbookImage({
  src,
  alt,
  fallbackLabel = 'KALARA DISTRO',
  className = '',
}: LookbookImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full bg-surface-container flex flex-col items-center justify-center p-lg text-center border-outline ${className}`}
      >
        <div className="w-10 h-10 border border-outline bg-surface flex items-center justify-center mb-sm">
          <span className="font-label text-label-sm text-on-surface uppercase">KD</span>
        </div>
        <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
