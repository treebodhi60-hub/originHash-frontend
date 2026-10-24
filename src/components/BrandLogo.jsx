// The OriginHash mark (the same artwork as the brand website), round and decorative: the wordmark
// or a label beside it always names the product. `size` is the drawn size in px.
const BrandLogo = ({ size = 20, className = '' }) => (
  <img
    className={`oh-brand-mark ${className}`}
    src={size <= 64 ? '/brand/originhash-logo-256.webp' : '/brand/originhash-logo-512.webp'}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable={false}
    decoding="async"
  />
);

export default BrandLogo;
