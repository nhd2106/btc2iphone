// A torn-paper edge, drawn once with a fixed seed so SSR and client match.
function tornPath(width: number, height: number, teeth: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const step = width / teeth;
  let d = `M0 ${height}`;
  for (let i = 0; i <= teeth; i++) d += ` L${(i * step).toFixed(1)} ${(rnd() * height * 0.9).toFixed(1)}`;
  return d + ` L${width} ${height} Z`;
}

const PATH = tornPath(1440, 28, 64, 42);

/** Place at the top of a dark section; `flip` for the bottom. */
export default function Torn({ flip = false, color = "var(--ink)" }: { flip?: boolean; color?: string }) {
  return (
    <svg
      className={"torn" + (flip ? " torn--flip" : "")}
      viewBox="0 0 1440 28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={PATH} fill={color} />
    </svg>
  );
}
