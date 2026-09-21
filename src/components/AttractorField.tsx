import React, { useEffect, useRef } from 'react';

/**
 * Cursor attractor field, ported from markdo27.github.io so the two sheets
 * share the same signature masthead. Circles drift inside the cell and are
 * pulled toward the pointer while it is over them. No dependencies.
 */
export const AttractorField: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const INK = '#0a0a0a';
    const PAPER =
      getComputedStyle(document.documentElement).getPropertyValue('--cell').trim() || '#f0f0f0';

    let FIELD = 150; // pointer field radius in css px, sized to the cell in measure()
    const PULL = 0.2; // pull at the centre of the field
    const DAMP_IDLE = 0.995;
    const DAMP_PULL = 0.985;
    const STEER = 0.012; // random steering, keeps paths from going straight forever
    const VMIN = 0.16;
    const VMAX = 0.85;
    const VCAP = 6; // hard speed cap while the pointer pulls
    const EASE = 0.06;
    const WALL = 0.98;
    const BOUNCE = 0.85;

    interface Body {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      m: number;
    }

    let w = 0;
    let h = 0;
    let bodies: Body[] = [];
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let running = false;
    const pointer = { x: 0, y: 0, on: false };
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    const measure = () => {
      const rect = host.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      FIELD = Math.max(110, Math.min(230, (w + h) * 0.5));
    };

    const idealCount = () => Math.max(22, Math.min(90, Math.round((w * h) / 1900)));

    const seed = () => {
      const count = idealCount();
      const big = Math.min(w, h) < 160 ? 6.5 : 8.5;
      bodies = [];
      for (let i = 0; i < count; i++) {
        const r = 3 + Math.pow(Math.random(), 1.8) * big;
        const speed = VMIN + Math.random() * (VMAX - VMIN);
        const angle = Math.random() * Math.PI * 2;
        bodies.push({
          x: r + Math.random() * Math.max(1, w - r * 2),
          y: r + Math.random() * Math.max(1, h - r * 2),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r,
          m: r * r
        });
      }
    };

    const step = (dt: number) => {
      const pulling = pointer.on;
      const damp = Math.pow(pulling ? DAMP_PULL : DAMP_IDLE, dt);

      for (const body of bodies) {
        if (pulling) {
          const dx = pointer.x - body.x;
          const dy = pointer.y - body.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (d < FIELD) {
            const f = PULL * (1 - d / FIELD) * dt;
            body.vx += (dx / d) * f;
            body.vy += (dy / d) * f;
          }
        }

        body.vx += (Math.random() - 0.5) * STEER * dt;
        body.vy += (Math.random() - 0.5) * STEER * dt;
        body.vx *= damp;
        body.vy *= damp;

        // Hold the idle speed inside a band so nothing ever settles, and cap
        // the rush while the pointer pulls. Eased, so letting go does not pop.
        const sp = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        if (sp < 0.0001) {
          body.vx = (Math.random() - 0.5) * VMIN * 2;
          body.vy = (Math.random() - 0.5) * VMIN * 2;
        } else if (pulling) {
          if (sp > VCAP) {
            body.vx *= VCAP / sp;
            body.vy *= VCAP / sp;
          }
        } else {
          const want = sp < VMIN ? VMIN : sp > VMAX ? VMAX : sp;
          if (want !== sp) {
            const k = 1 + (want / sp - 1) * Math.min(1, EASE * dt);
            body.vx *= k;
            body.vy *= k;
          }
        }

        body.x += body.vx * dt;
        body.y += body.vy * dt;

        if (body.x - body.r < 0) {
          body.x = body.r;
          body.vx = Math.abs(body.vx) * WALL;
        } else if (body.x + body.r > w) {
          body.x = w - body.r;
          body.vx = -Math.abs(body.vx) * WALL;
        }
        if (body.y - body.r < 0) {
          body.y = body.r;
          body.vy = Math.abs(body.vy) * WALL;
        } else if (body.y + body.r > h) {
          body.y = h - body.r;
          body.vy = -Math.abs(body.vy) * WALL;
        }
      }

      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const c = bodies[j];
          let ox = c.x - a.x;
          let oy = c.y - a.y;
          let dist = Math.sqrt(ox * ox + oy * oy);
          const min = a.r + c.r;
          if (dist === 0) {
            dist = 0.01;
            ox = 0.01;
            oy = 0;
          }
          if (dist >= min) continue;

          const nx = ox / dist;
          const ny = oy / dist;
          const over = min - dist;
          const tm = a.m + c.m;
          a.x -= nx * over * (c.m / tm);
          a.y -= ny * over * (c.m / tm);
          c.x += nx * over * (a.m / tm);
          c.y += ny * over * (a.m / tm);

          const sep = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (sep >= 0) continue;
          const imp = (-(1 + BOUNCE) * sep) / (1 / a.m + 1 / c.m);
          a.vx -= (imp / a.m) * nx;
          a.vy -= (imp / a.m) * ny;
          c.vx += (imp / c.m) * nx;
          c.vy += (imp / c.m) * ny;
        }
      }
    };

    const draw = () => {
      // Painted, not cleared: the copy above blends against this, so the ground
      // under it has to be opaque.
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = INK;
      for (const body of bodies) {
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 16.667, 2.5) : 1;
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || still.matches) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const sync = () => {
      if (onScreen && !document.hidden) start();
      else stop();
    };

    measure();
    seed();
    draw();

    const cell = host.parentElement || host;

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.on = true;
    };
    const onPointerOut = () => {
      pointer.on = false;
    };

    cell.addEventListener('pointermove', onPointerMove);
    cell.addEventListener('pointerleave', onPointerOut);
    cell.addEventListener('pointercancel', onPointerOut);

    let resizeTimer = 0;
    const onResize = () => {
      const before = bodies.length;
      measure();
      for (const body of bodies) {
        body.x = Math.min(Math.max(body.x, body.r), Math.max(body.r, w - body.r));
        body.y = Math.min(Math.max(body.y, body.r), Math.max(body.r, h - body.r));
      }
      draw();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (Math.abs(idealCount() - before) > before * 0.25) {
          seed();
          draw();
        }
      }, 220);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      sync();
    });
    intersectionObserver.observe(cell);

    const onStillChange = () => {
      if (still.matches) {
        stop();
        seed();
        draw();
      } else {
        sync();
      }
    };

    document.addEventListener('visibilitychange', sync);
    still.addEventListener('change', onStillChange);

    sync();

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cell.removeEventListener('pointermove', onPointerMove);
      cell.removeEventListener('pointerleave', onPointerOut);
      cell.removeEventListener('pointercancel', onPointerOut);
      document.removeEventListener('visibilitychange', sync);
      still.removeEventListener('change', onStillChange);
    };
  }, []);

  return (
    <div className="play" aria-hidden="true" ref={hostRef}>
      <canvas ref={canvasRef} />
    </div>
  );
};
