type Props = { name: string; image: string | null; size: number };

/**
 * A round avatar with the initial underneath, so a picture that is blocked,
 * expired or 404s degrades to something readable rather than a broken image.
 */
export default function Face({ name, image, size }: Props) {
  return (
    <span
      className="face"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      <span className="face-initial" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
      {image ? (
        // Google's avatar, served from their CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="face-img" src={image} alt="" width={size} height={size} loading="lazy" />
      ) : null}
    </span>
  );
}
