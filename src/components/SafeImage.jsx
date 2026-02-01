import React from "react";

export default function SafeImage({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder-perfume.svg",
  ...rest
}) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const resolvedSrc = src && src.startsWith("/uploads/") && apiBase ? `${apiBase}${src}` : src;
  const [current, setCurrent] = React.useState(resolvedSrc || fallbackSrc);

  React.useEffect(() => {
    setCurrent(resolvedSrc || fallbackSrc);
  }, [resolvedSrc, fallbackSrc]);

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
