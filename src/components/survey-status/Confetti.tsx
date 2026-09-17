'use client';

import type { CSSProperties } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
  shape: 'circle' | 'pill' | 'sparkle';
  delay: number;
}

// Curated pastel celebration palette matching Apple UI
const PIECES: ConfettiPiece[] = [
  { id: 1, x: -48, y: -24, scale: 0.85, color: '#10b981', shape: 'pill', delay: 0.05 },
  { id: 2, x: 44, y: -22, scale: 0.9, color: '#3b82f6', shape: 'circle', delay: 0.1 },
  { id: 3, x: -52, y: 18, scale: 0.75, color: '#f59e0b', shape: 'circle', delay: 0.15 },
  { id: 4, x: 50, y: 16, scale: 0.8, color: '#ec4899', shape: 'pill', delay: 0.08 },
  { id: 5, x: -28, y: -32, scale: 0.7, color: '#8b5cf6', shape: 'sparkle', delay: 0.12 },
  { id: 6, x: 26, y: -30, scale: 0.75, color: '#10b981', shape: 'sparkle', delay: 0.18 },
];

export function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes subtleFloat {
          0%, 100% {
            transform: translate(var(--tx), var(--ty)) scale(var(--scale));
          }
          50% {
            transform: translate(var(--tx), calc(var(--ty) - 3px)) scale(calc(var(--scale) * 1.05));
          }
        }
      `}</style>
      <div className="relative h-16 w-16">
        {PIECES.map((p) => {
          const style = {
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
            '--scale': p.scale,
            animation: `subtleFloat 3s ease-in-out infinite ${p.delay}s`,
          } as CSSProperties;

          return (
            <div
              key={p.id}
              className="absolute left-1/2 top-1/2 -ml-1 -mt-1 opacity-75"
              style={style}
            >
              {p.shape === 'circle' ? (
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
              ) : p.shape === 'pill' ? (
                <div
                  className="h-2 w-1 rounded-full rotate-45"
                  style={{ backgroundColor: p.color }}
                />
              ) : (
                <div
                  className="h-1.5 w-1.5 rounded-[1px] rotate-12"
                  style={{ backgroundColor: p.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
