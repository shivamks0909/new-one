'use client';

import { useEffect, useRef } from 'react';

interface FluidCanvasProps {
  color: string;
  accentLight: string;
}

export function FluidCanvas({ color, accentLight }: FluidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let step = 0;

    // Mouse interactive ripples
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      step += 0.015;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw 3 organic overlapping liquid fluid wave layers
      const waves = [
        { yOffset: height * 0.65, amplitude: 38, frequency: 0.004, speed: 0.02, alpha: 0.22 },
        { yOffset: height * 0.72, amplitude: 48, frequency: 0.003, speed: 0.015, alpha: 0.35 },
        { yOffset: height * 0.82, amplitude: 55, frequency: 0.002, speed: 0.01, alpha: 0.5 },
      ];

      waves.forEach((w, idx) => {
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 12) {
          // Liquid sine equation with cursor displacement
          const dx = x - mouse.x;
          const distInfluence = Math.max(0, 1 - Math.abs(dx) / 380) * 35;
          const y =
            w.yOffset +
            Math.sin(x * w.frequency + step * (idx + 1) * 1.3) * w.amplitude +
            Math.cos(x * w.frequency * 0.7 + step) * (w.amplitude * 0.5) +
            Math.sin(dx * 0.01) * distInfluence;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, w.yOffset - 50, 0, height);
        grad.addColorStop(0, `${color}${Math.floor(w.alpha * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${accentLight}99`);

        ctx.fillStyle = grad;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, accentLight]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70"
    />
  );
}
