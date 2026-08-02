import { useLayoutEffect, useRef } from 'react';

interface AutoFitWordProps {
  word: string;
  className?: string;
  maxRem?: number;
  minRem?: number;
}

export default function AutoFitWord({
  word,
  className,
  maxRem = 2.25,
  minRem = 0.65,
}: AutoFitWordProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const maxPx = maxRem * rootFontSize;
    const minPx = minRem * rootFontSize;

    function fit() {
      el!.style.fontSize = `${maxRem}rem`;
      let sizePx = maxPx;

      while (el!.scrollWidth > el!.clientWidth && sizePx > minPx) {
        sizePx -= 1;
        el!.style.fontSize = `${sizePx}px`;
      }
    }

    fit();

    const target = el.parentElement ?? el;
    const observer = new ResizeObserver(fit);
    observer.observe(target);

    return () => observer.disconnect();
  }, [word, maxRem, minRem]);

  return (
    <h2 ref={ref} className={className}>
      {word}
    </h2>
  );
}
