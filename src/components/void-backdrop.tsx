// Deep-space backdrop: a starfield, slow drifting haze, the odd shooting star and,
// on the create screen, a planet horizon whose rim fades toward the edges.

/** Small seeded PRNG so the starfield is identical on the server and in the browser. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261022);
const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
const STARS = Array.from({ length: 170 }, (_, index) => ({
  x: round(random() * 1600, 1),
  y: round(random() * 1000, 1),
  // Mostly tiny stars with the occasional brighter one.
  r: round(0.35 + random() ** 4 * 1.25, 2),
  opacity: round(0.14 + random() * 0.6, 2),
  twinkle: index % 8 === 0,
}));

export function VoidBackdrop({ planet = true }: { planet?: boolean }) {
  return (
    <div className={`void ${planet ? "" : "void-open"}`} aria-hidden="true">
      <div className="void-haze void-haze-a" />
      <div className="void-haze void-haze-b" />
      <div className="void-haze void-haze-c" />
      <svg className="void-stars" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        {STARS.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#dfe8ff"
            fillOpacity={star.opacity}
            className={star.twinkle ? "void-twinkle" : undefined}
            style={star.twinkle ? { animationDelay: `${(index % 7) * 0.8}s` } : undefined}
          />
        ))}
      </svg>
      <span className="void-shooting void-shooting-a" />
      <span className="void-shooting void-shooting-b" />
      {planet && (
        <>
          <div className="void-atmosphere" />
          <div className="void-planet" />
        </>
      )}
    </div>
  );
}
