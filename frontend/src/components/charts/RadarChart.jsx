import { polygonPoints, radarVertex } from '../../lib/chart.js';

/**
 * Five-dimension health radar. Takes the API's dimension rows
 * ([{ name, value }]) and draws rings, axes, the value polygon and labels.
 */
export function RadarChart({ dimensions, size = 340, stroke = '#4F46E5' }) {
  // Axis labels sit outside the polygon and are anchored start/end, so the
  // viewBox is extended past the drawing box to give the text room.
  const gutter = 74;
  const geometry = { cx: size / 2, cy: size / 2, radius: size * 0.34 };
  const sides = dimensions.length;

  const ring = (fraction) =>
    polygonPoints(dimensions.map((_, i) => radarVertex(geometry, fraction, i, sides)));

  const valuePoints = dimensions.map((d, i) =>
    radarVertex(geometry, d.value / 100, i, sides),
  );

  return (
    <svg
      viewBox={`${-gutter} 0 ${size + gutter * 2} ${size}`}
      className="h-auto w-full"
      style={{ maxWidth: size + gutter }}
      role="img"
      aria-label={`Health radar: ${dimensions.map((d) => `${d.name} ${d.value}`).join(', ')}`}
    >
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={ring(fraction)}
          fill="none"
          stroke="#ECECEF"
          strokeWidth="1"
        />
      ))}

      {dimensions.map((d, i) => {
        const v = radarVertex(geometry, 1, i, sides);
        return (
          <line
            key={d.name}
            x1={geometry.cx}
            y1={geometry.cy}
            x2={v.x}
            y2={v.y}
            stroke="#ECECEF"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={polygonPoints(valuePoints)}
        fill={stroke}
        fillOpacity="0.16"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {valuePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      ))}

      {dimensions.map((d, i) => {
        const v = radarVertex({ ...geometry, radius: geometry.radius + 22 }, 1, i, sides);
        const cos = Math.cos(v.angle);
        return (
          <text
            key={d.name}
            x={v.x}
            y={v.y + 4}
            textAnchor={cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'}
            className="fill-muted text-[11px] font-medium"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}
