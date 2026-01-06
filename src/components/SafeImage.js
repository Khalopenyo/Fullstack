import React from "react";

export default function SafeImage({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder-perfume.svg",
  ...rest
}) {
  const [current, setCurrent] = React.useState(src || fallbackSrc);

  React.useEffect(() => {
    setCurrent(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={current || fallbackSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
      {...rest}
    />
  );
}
