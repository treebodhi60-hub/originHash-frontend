import { useEffect, useRef, useState } from 'react';

// True once the element has come into view, and stays true (for one-time reveals).
// Content must never stay hidden waiting for this: it also turns true after `fallbackMs`
// whatever happens (an element inside a sideways-scrolled row, an observer that never fires),
// and straight away where IntersectionObserver is missing.
export default function useInView(rootMargin = '0px 0px -8% 0px', fallbackMs = 1200) {
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
    const fallback = setTimeout(() => setInView(true), fallbackMs);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [inView, rootMargin, fallbackMs]);

  return [ref, inView];
}
