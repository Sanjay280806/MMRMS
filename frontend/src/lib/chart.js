/** Geometry helpers shared by the SVG chart components. */

/**
 * Maps values onto an SVG box and returns both the point list and the
 * path commands, so line, area and dot layers stay in lockstep.
 */
export function linePoints(values, { width, height, padTop = 22, padBottom = 22, min, max }) {
  if (values.length === 0) return { points: [], line: '', area: '', baseline: height - padBottom };

  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const range = hi - lo || 1;
  const baseline = height - padBottom;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((value, i) => ({
    value,
    x: Number((i * step).toFixed(1)),
    y: Number((baseline - ((value - lo) / range) * (baseline - padTop)).toFixed(1)),
  }));

  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  return { points, line, area: `${line} L ${width} ${baseline} L 0 ${baseline} Z`, baseline };
}

/** Vertex of a regular polygon, first point at 12 o'clock. */
export function radarVertex({ cx, cy, radius }, fraction, index, sides) {
  const angle = ((-90 + index * (360 / sides)) * Math.PI) / 180;
  return {
    x: cx + radius * fraction * Math.cos(angle),
    y: cy + radius * fraction * Math.sin(angle),
    angle,
  };
}

export function polygonPoints(points) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** Conic-gradient stops for a donut, given [{ count, stroke }] segments. */
export function conicStops(segments) {
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;
  let acc = 0;
  return segments
    .map((s) => {
      const from = (acc / total) * 360;
      acc += s.count;
      const to = (acc / total) * 360;
      return `${s.stroke} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
    })
    .join(', ');
}
