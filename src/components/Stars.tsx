"use client";
import { useEffect, useState } from "react";

type Dot = { x: number; y: number; s: number; d: number; firefly: boolean };

export default function Stars() {
  const [dots, setDots] = useState<Dot[]>([]);
  useEffect(() => {
    setDots(
      Array.from({ length: 35 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: i % 7 === 0 ? 8 + Math.random() * 6 : 1 + Math.random() * 1.5,
        d: Math.random() * 8,
        firefly: i % 7 === 0,
      }))
    );
  }, []);
  return (
    <div className="stars" aria-hidden>
      {dots.map((t, i) =>
        t.firefly ? (
          <b key={i} style={{ left: `${t.x}%`, width: t.s, height: t.s, animationDelay: `-${t.d * 2}s` }} />
        ) : (
          <i key={i} style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.s, height: t.s, animationDelay: `-${t.d}s` }} />
        )
      )}
    </div>
  );
}