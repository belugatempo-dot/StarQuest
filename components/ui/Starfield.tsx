/**
 * Starfield — Full-screen animated star particle layer.
 *
 * Renders three layers (spec §2, §8 items 1-2):
 *   1. Bright stars (2px, #FFD43B) with staggered twinkle animations
 *   2. Dim stars (1px, rgba(255,255,255,0.5))
 *   3. Nebula patches — large blurred circles at very low opacity
 *
 * Fixed position, covers viewport, pointer-events: none.
 * Uses a seeded PRNG for deterministic positions (SSR-safe).
 */

const BRIGHT_STAR_COUNT = 40;
const DIM_STAR_COUNT = 60;
const NEBULA_COUNT = 3;

/** Simple seeded PRNG (Mulberry32) for deterministic positions */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(42);

interface Star {
  x: number;
  y: number;
  delay: number;
  duration: number;
}

interface Nebula {
  x: number;
  y: number;
  size: number;
  color: string;
}

const brightStars: Star[] = Array.from({ length: BRIGHT_STAR_COUNT }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  delay: rand() * 5,
  duration: 2 + rand() * 3,
}));

const dimStars: Star[] = Array.from({ length: DIM_STAR_COUNT }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  delay: rand() * 5,
  duration: 3 + rand() * 4,
}));

const nebulaColors = [
  "rgba(79, 70, 229, 0.15)", // Indigo
  "rgba(30, 58, 95, 0.18)", // Deep blue
  "rgba(49, 46, 129, 0.12)", // Purple
];

const nebulae: Nebula[] = Array.from({ length: NEBULA_COUNT }, (_, i) => ({
  x: rand() * 80 + 10,
  y: rand() * 80 + 10,
  size: 200 + rand() * 200,
  color: nebulaColors[i % nebulaColors.length],
}));

export default function Starfield() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, pointerEvents: "none" }}
    >
      {/* Nebula — large blurred circles */}
      {nebulae.map((n, i) => (
        <div
          key={`nebula-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: `${n.size}px`,
            height: `${n.size}px`,
            background: n.color,
            filter: "blur(80px)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Bright stars — 2px, golden */}
      {brightStars.map((s, i) => (
        <div
          key={`bright-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: "2px",
            height: "2px",
            backgroundColor: "#FFD43B",
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Dim stars — 1px, white */}
      {dimStars.map((s, i) => (
        <div
          key={`dim-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: "1px",
            height: "1px",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
