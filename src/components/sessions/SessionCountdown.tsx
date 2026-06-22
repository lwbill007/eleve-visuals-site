"use client";

import { useEffect, useState } from "react";

export function SessionCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function tick() {
      const end = new Date(deadline).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining("Applications closing soon");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      if (days > 0) setRemaining(`${days}d ${hours}h until applications close`);
      else if (hours > 0) setRemaining(`${hours}h ${minutes}m until applications close`);
      else setRemaining(`${minutes}m until applications close`);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!remaining) return null;

  return (
    <p className="text-xs tracking-[0.12em] text-accent uppercase">{remaining}</p>
  );
}
