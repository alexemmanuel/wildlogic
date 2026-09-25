import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../../types/game';

interface WeatherCanvasOverlayProps {
  weather: WeatherType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  life: number;
  maxLife: number;
  extra?: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface LightningArc {
  points: { x: number; y: number }[];
  alpha: number;
  color: string;
}

export const WeatherCanvasOverlay: React.FC<WeatherCanvasOverlayProps> = ({ weather }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 450);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          width = canvas.width = Math.floor(w);
          height = canvas.height = Math.floor(h);
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Particle pools
    const particles: Particle[] = [];
    const splashes: Splash[] = [];
    const lightningArcs: LightningArc[] = [];
    let tick = 0;

    // Initialize particles based on weather
    const initParticles = () => {
      particles.length = 0;
      splashes.length = 0;
      lightningArcs.length = 0;

      const count =
        weather === 'acid_monsoon'
          ? 70
          : weather === 'solar_flare'
          ? 55
          : weather === 'emp_dust_storm'
          ? 65
          : weather === 'bioluminescent_fog'
          ? 40
          : 20;

      for (let i = 0; i < count; i++) {
        spawnParticle(true);
      }
    };

    const spawnParticle = (randomY: boolean = false) => {
      const startX = Math.random() * (width + 100) - 50;
      const startY = randomY ? Math.random() * height : -20;

      if (weather === 'acid_monsoon') {
        particles.push({
          x: startX,
          y: startY,
          vx: -1.5 + Math.random() * 0.5,
          vy: 8 + Math.random() * 5,
          size: 1 + Math.random() * 1.5,
          alpha: 0.4 + Math.random() * 0.5,
          maxAlpha: 0.8,
          color: Math.random() > 0.3 ? '#34d399' : '#a3e635', // Emerald / Neon lime
          life: 0,
          maxLife: 100 + Math.random() * 50,
          extra: 12 + Math.random() * 10, // Rain streak length
        });
      } else if (weather === 'solar_flare') {
        particles.push({
          x: Math.random() * width,
          y: randomY ? Math.random() * height : height + 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(1 + Math.random() * 2.5),
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.2 + Math.random() * 0.6,
          maxAlpha: 0.8,
          color: Math.random() > 0.4 ? '#f59e0b' : '#fbbf24', // Amber / gold embers
          life: 0,
          maxLife: 60 + Math.random() * 80,
          extra: Math.random() * Math.PI * 2, // shimmer phase
        });
      } else if (weather === 'bioluminescent_fog') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: 3 + Math.random() * 5,
          alpha: 0.15 + Math.random() * 0.45,
          maxAlpha: 0.7,
          color:
            Math.random() > 0.5
              ? '#06b6d4'
              : Math.random() > 0.5
              ? '#a855f7'
              : '#10b981', // Cyan / Violet / Emerald orbs
          life: 0,
          maxLife: 120 + Math.random() * 100,
          extra: Math.random() * 0.05, // pulse frequency
        });
      } else if (weather === 'emp_dust_storm') {
        particles.push({
          x: startX,
          y: Math.random() * height,
          vx: 5 + Math.random() * 6,
          vy: 1 + Math.random() * 2,
          size: 1 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.5,
          maxAlpha: 0.8,
          color: Math.random() > 0.4 ? '#38bdf8' : '#818cf8', // Electric cyan / violet
          life: 0,
          maxLife: 60 + Math.random() * 40,
          extra: 8 + Math.random() * 8, // streak length
        });
      } else {
        // clear_skies subtle motes
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.2 + Math.random() * 0.3),
          size: 1 + Math.random() * 1.5,
          alpha: 0.15 + Math.random() * 0.25,
          maxAlpha: 0.4,
          color: '#6ee7b7',
          life: 0,
          maxLife: 150 + Math.random() * 100,
        });
      }
    };

    initParticles();

    // Render loop
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // --- AMBIENT WEATHER POST-PROCESSING SHADERS ---
      if (weather === 'solar_flare') {
        // Shimmering golden atmospheric haze & solar corona pulse
        const pulse = 0.08 + Math.sin(tick * 0.04) * 0.03;
        const heatGrad = ctx.createLinearGradient(0, 0, width, height);
        heatGrad.addColorStop(0, `rgba(245, 158, 11, ${pulse + 0.04})`);
        heatGrad.addColorStop(0.5, `rgba(251, 191, 36, ${pulse * 0.6})`);
        heatGrad.addColorStop(1, `rgba(217, 119, 6, ${pulse + 0.02})`);
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, 0, width, height);

        // Heat wave ripples
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.06)';
        ctx.lineWidth = 3;
        for (let y = 10; y < height; y += 40) {
          ctx.beginPath();
          for (let x = 0; x < width; x += 15) {
            const offsetY = Math.sin(x * 0.03 + tick * 0.05 + y) * 4;
            if (x === 0) ctx.moveTo(x, y + offsetY);
            else ctx.lineTo(x, y + offsetY);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (weather === 'acid_monsoon') {
        // Toxic green atmospheric wash & dark rain vignette
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          width * 0.2,
          width / 2,
          height / 2,
          width * 0.7
        );
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.03)');
        grad.addColorStop(1, 'rgba(5, 46, 22, 0.18)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (weather === 'bioluminescent_fog') {
        // Volumetric rolling mist patches
        const fogAlpha = 0.12 + Math.sin(tick * 0.02) * 0.04;
        const fogGrad1 = ctx.createRadialGradient(
          (width * 0.3) + Math.cos(tick * 0.015) * 40,
          (height * 0.4) + Math.sin(tick * 0.015) * 30,
          20,
          width * 0.3,
          height * 0.4,
          width * 0.5
        );
        fogGrad1.addColorStop(0, `rgba(6, 182, 212, ${fogAlpha + 0.05})`);
        fogGrad1.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = fogGrad1;
        ctx.fillRect(0, 0, width, height);

        const fogGrad2 = ctx.createRadialGradient(
          (width * 0.7) + Math.sin(tick * 0.012) * 50,
          (height * 0.7) + Math.cos(tick * 0.012) * 40,
          20,
          width * 0.7,
          height * 0.7,
          width * 0.45
        );
        fogGrad2.addColorStop(0, `rgba(168, 85, 247, ${fogAlpha + 0.04})`);
        fogGrad2.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = fogGrad2;
        ctx.fillRect(0, 0, width, height);
      } else if (weather === 'emp_dust_storm') {
        // High frequency static flickers and electrical disturbance
        if (Math.random() < 0.12) {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.03 + Math.random() * 0.04})`;
          ctx.fillRect(0, Math.random() * height, width, 4 + Math.random() * 12);
        }

        // Random micro-lightning arc generator
        if (Math.random() < 0.035) {
          const arcPoints: { x: number; y: number }[] = [];
          let curX = Math.random() * width;
          let curY = Math.random() * (height * 0.4);
          arcPoints.push({ x: curX, y: curY });

          const segments = 4 + Math.floor(Math.random() * 4);
          for (let s = 0; s < segments; s++) {
            curX += (Math.random() - 0.5) * 45;
            curY += 20 + Math.random() * 25;
            arcPoints.push({ x: curX, y: curY });
          }

          lightningArcs.push({
            points: arcPoints,
            alpha: 0.85,
            color: Math.random() > 0.5 ? '#38bdf8' : '#c084fc',
          });
        }
      }

      // --- DRAW & UPDATE LIGHTNING ARCS (EMP Storm) ---
      for (let i = lightningArcs.length - 1; i >= 0; i--) {
        const arc = lightningArcs[i];
        ctx.save();
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = arc.alpha;

        ctx.beginPath();
        arc.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        arc.alpha -= 0.15;
        if (arc.alpha <= 0) {
          lightningArcs.splice(i, 1);
        }
      }

      // --- DRAW & UPDATE SPLASHES (Acid Monsoon) ---
      for (let i = splashes.length - 1; i >= 0; i--) {
        const splash = splashes[i];
        ctx.save();
        ctx.strokeStyle = splash.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = splash.alpha;
        ctx.beginPath();
        ctx.ellipse(
          splash.x,
          splash.y,
          splash.radius,
          splash.radius * 0.4,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();

        splash.radius += 0.8;
        splash.alpha -= 0.05;
        if (splash.alpha <= 0 || splash.radius >= splash.maxRadius) {
          splashes.splice(i, 1);
        }
      }

      // --- DRAW & UPDATE PARTICLES ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        if (weather === 'acid_monsoon') {
          // Draw high speed rain streak
          const streakLen = p.extra || 15;
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.5, p.y - streakLen);
          ctx.stroke();
          ctx.restore();

          // Spawn splash when hitting bottom region
          if (p.y >= height - Math.random() * 30) {
            splashes.push({
              x: p.x,
              y: p.y,
              radius: 2,
              maxRadius: 6 + Math.random() * 5,
              alpha: 0.6,
              color: p.color,
            });
            particles.splice(i, 1);
            spawnParticle(false);
            continue;
          }
        } else if (weather === 'solar_flare') {
          // Shimmering glowing solar ember
          const pulse = Math.sin((p.extra || 0) + tick * 0.08) * 0.3 + 0.7;
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.globalAlpha = p.alpha * pulse;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (weather === 'bioluminescent_fog') {
          // Floating bioluminescent orbs with glowing halo
          const pulse = Math.sin(tick * 0.04 + i) * 0.25 + 0.75;
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12 * pulse;
          ctx.globalAlpha = p.alpha * pulse;

          // Inner bright nucleus
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Outer translucent halo
          ctx.globalAlpha = p.alpha * 0.35 * pulse;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.8 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (weather === 'emp_dust_storm') {
          // Fast ionized dust filament
          const streakLen = p.extra || 10;
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - streakLen, p.y - p.vy);
          ctx.stroke();
          ctx.restore();
        } else {
          // Default clear skies light dust
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Out of bounds / life expired check
        const isOutOfBounds =
          p.x < -60 ||
          p.x > width + 60 ||
          p.y < -40 ||
          p.y > height + 40 ||
          p.life >= p.maxLife;

        if (isOutOfBounds) {
          particles.splice(i, 1);
          spawnParticle(false);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [weather]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 pointer-events-none rounded-2xl w-full h-full mix-blend-screen"
      style={{ pointerEvents: 'none' }}
    />
  );
};
