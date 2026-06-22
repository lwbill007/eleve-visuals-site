"use client";

import { useEffect, useRef, useState } from "react";

function parseStatValue(value: string): { prefix: string; num: number; suffix: string } | null {
  const match = value.trim().match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseFloat(match[2]), suffix: match[3] };
}

export function useCountUp(value: string, active: boolean, duration = 1600) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const p = parseStatValue(value);
    if (!active || !p) {
      setDisplay(value);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(p.num * eased);
      setDisplay(`${p.prefix}${current}${p.suffix}`);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [active, value, duration]);

  return display;
}

export function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
