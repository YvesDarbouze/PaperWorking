import React from 'react';

type NextImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
};

export default function NextImageMock({
  src,
  fill,
  priority,
  sizes,
  alt,
  unoptimized,
  quality,
  loader,
  placeholder,
  blurDataURL,
  ...rest
}: NextImageProps & Record<string, unknown>) {
  const resolvedSrc = typeof src === 'string' ? src : src?.src;
  return <img src={resolvedSrc} alt={alt ?? ''} {...(rest as object)} />;
}
