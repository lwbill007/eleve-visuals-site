"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, type MotionValue } from "framer-motion";

export function AmbientVideoBackground({
  src,
  poster,
  reduce,
  y,
  scale,
}: {
  src: string;
  poster: string | null;
  reduce: boolean | null;
  y?: MotionValue<string>;
  scale?: MotionValue<number>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const staticY = useMotionValue("0%");
  const staticScale = useMotionValue(1);

  useEffect(() => {
    setReady(false);
  }, [src]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video || reduce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    video.play().catch(() => {});
    return () => observer.disconnect();
  }, [reduce, src]);

  return (
    <motion.div ref={sectionRef} style={{ y: y ?? staticY, scale: scale ?? staticScale }} className="absolute inset-0">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted
        loop
        playsInline
        autoPlay={!reduce}
        preload="metadata"
        onCanPlay={() => setReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      {!ready && poster && (
        <Image src={poster} alt="" fill priority className="object-cover" sizes="100vw" />
      )}
    </motion.div>
  );
}
