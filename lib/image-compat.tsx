import type { ImgHTMLAttributes } from 'react'

type ImageSource = string | { src: string }

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: ImageSource
  fill?: boolean
  priority?: boolean
  sizes?: string
}

export default function Image({
  src,
  alt,
  fill,
  priority,
  sizes: _sizes,
  loading,
  style,
  ...props
}: ImageProps) {
  const resolvedSrc = typeof src === 'string' ? src : src.src

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? ''}
      loading={priority ? 'eager' : loading}
      style={{
        ...(fill
          ? {
              height: '100%',
              inset: 0,
              objectFit: 'cover',
              position: 'absolute',
              width: '100%',
            }
          : null),
        ...style,
      }}
      {...props}
    />
  )
}
