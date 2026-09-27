import { useMemo, useState, type SyntheticEvent } from 'react';

const WIDTHS = [400, 800];

const DEFAULT_SIZES = '(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 90vw';

type ThumbProps = {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
};

function thumbCandidates(src: string) {
  if (!src.startsWith('/images/')) return [];
  const base = src.slice('/images/'.length).replace(/\.[^.]+$/, '');
  return WIDTHS.map(w => `/images/thumbs/${base}-${w}.jpg ${w}w`);
}

export function Thumb({
  src,
  alt = '',
  sizes = DEFAULT_SIZES,
  className,
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  onError,
}: ThumbProps) {
  const [fallback, setFallback] = useState(false);
  const srcSet = useMemo(() => (fallback ? undefined : thumbCandidates(src).join(', ') || undefined), [src, fallback]);

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    onError?.(e);
    if (fallback) return;
    e.currentTarget.removeAttribute('srcset');
    setFallback(true);
  };

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onError={handleError}
    />
  );
}
