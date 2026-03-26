import { useEffect, useRef } from "react";

const SUBJECTS = [
  "Typography",
  "Illustration",
  "Color Theory",
  "Visual Communication",
  "Design History",
];

interface GraphLine {
  x: number;
  points: number[];
  progress: number;
  speed: number;
  opacity: number;
  width: number;
}

interface FloatingLabel {
  text: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  maxOpacity: number;
  phase: "in" | "hold" | "out";
  phaseTimer: number;
}

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;
    const lines: GraphLine[] = [];
    const labels: FloatingLabel[] = [];

    // Gold color in hex for canvas (can't use oklch)
    const GOLD = "183,155,87"; // RGB of #B79B57

    function resize() {
      w = canvas!.offsetWidth;
      h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
    }

    function makeSegmentPoints(count: number): number[] {
      const pts: number[] = [];
      let y = Math.random() * 0.6 + 0.2; // start mid
      for (let i = 0; i <= count; i++) {
        pts.push(y);
        y += (Math.random() - 0.45) * 0.12;
        if (y < 0.05) y = 0.05;
        if (y > 0.95) y = 0.95;
      }
      return pts;
    }

    function makeLine(): GraphLine {
      return {
        x: Math.random() * w,
        points: makeSegmentPoints(8),
        progress: 0,
        speed: 0.0003 + Math.random() * 0.0003,
        opacity: 0.04 + Math.random() * 0.04,
        width: 0.6 + Math.random() * 0.6,
      };
    }

    function makeLabel(): FloatingLabel {
      return {
        text: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)],
        x: Math.random() * w,
        y: h + 20,
        speed: 0.18 + Math.random() * 0.14,
        opacity: 0,
        maxOpacity: 0.05 + Math.random() * 0.02,
        phase: "in",
        phaseTimer: 0,
      };
    }

    // Init
    resize();
    for (let i = 0; i < 10; i++) {
      const l = makeLine();
      l.progress = Math.random(); // stagger initial positions
      lines.push(l);
    }
    for (let i = 0; i < 5; i++) {
      const lb = makeLabel();
      lb.y = Math.random() * h; // stagger initial
      lb.phase = "hold";
      lb.opacity = lb.maxOpacity;
      labels.push(lb);
    }

    let lastTime = 0;
    function draw(time: number) {
      animId = requestAnimationFrame(draw);
      const dt = time - lastTime;
      lastTime = time;
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, w, h);

      // Draw graph lines
      for (const line of lines) {
        line.progress += line.speed * dt;
        if (line.progress > 1) {
          // reset
          Object.assign(line, makeLine());
          line.progress = 0;
          line.x = Math.random() * w;
          continue;
        }

        const segCount = line.points.length - 1;
        const totalProg = line.progress * segCount;
        const drawnSegs = Math.floor(totalProg);
        const segFrac = totalProg - drawnSegs;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${GOLD}, ${line.opacity})`;
        ctx.lineWidth = line.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const lineW = 80;
        const lineH = h * 0.35;
        const startY = h - lineH * 0.2;

        for (let i = 0; i <= drawnSegs; i++) {
          const px = line.x - lineW / 2 + (i / segCount) * lineW;
          const py = startY - line.points[i] * lineH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        // Partial last segment
        if (drawnSegs < segCount) {
          const i = drawnSegs;
          const px0 = line.x - lineW / 2 + (i / segCount) * lineW;
          const py0 = startY - line.points[i] * lineH;
          const px1 = line.x - lineW / 2 + ((i + 1) / segCount) * lineW;
          const py1 = startY - line.points[i + 1] * lineH;
          if (i === 0) ctx.moveTo(px0, py0);
          ctx.lineTo(px0 + (px1 - px0) * segFrac, py0 + (py1 - py0) * segFrac);
        }
        ctx.stroke();
      }

      // Draw floating labels
      for (const lb of labels) {
        lb.y -= lb.speed * (dt / 16);

        if (lb.phase === "in") {
          lb.opacity += 0.0008 * dt;
          lb.phaseTimer += dt;
          if (lb.opacity >= lb.maxOpacity) {
            lb.opacity = lb.maxOpacity;
            lb.phase = "hold";
            lb.phaseTimer = 0;
          }
        } else if (lb.phase === "hold") {
          lb.phaseTimer += dt;
          if (lb.phaseTimer > 4000) {
            lb.phase = "out";
            lb.phaseTimer = 0;
          }
        } else {
          lb.opacity -= 0.0008 * dt;
          if (lb.opacity <= 0 || lb.y < -30) {
            Object.assign(lb, makeLabel());
            continue;
          }
        }

        ctx.font = "10px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = `rgba(${GOLD}, ${lb.opacity})`;
        ctx.letterSpacing = "0.08em";
        ctx.fillText(lb.text, lb.x, lb.y);
      }
    }

    animId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}
