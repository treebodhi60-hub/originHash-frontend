import { useEffect, useRef, useState } from 'react';

// True once the element has come into view, and stays true (for one-time reveals).
// Without IntersectionObserver it is true straight away, so nothing ever stays hidden.
export default function useInView(rootMargin = '0px 0px -8% 0px') {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (inView || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
