"use client";

// 一组纯 SVG 情报可视化图，无第三方依赖，配色走 --brand（各台自动暖/冷）。
// 预览用；选定后接进首页右栏。

// ── ① 信号雷达图（蜘蛛网）─────────────────────────────
export function RadarChart({
  axes,
  size = 220,
}: {
  axes: Array<{ label: string; value: number }>;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = axes.length;
  const max = Math.max(1, ...axes.map((a) => a.value));
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, radius: number) => [
    cx + radius * Math.cos(angle(i)),
    cy + radius * Math.sin(angle(i)),
  ];
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = axes
    .map((a, i) => pt(i, (a.value / max) * r).join(","))
    .join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => pt(i, r * ring).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon points={poly} fill="var(--brand)" fillOpacity={0.16} stroke="var(--brand)" strokeWidth={1.75} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, (a.value / max) * r);
        return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--brand)" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, r + 16);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fontSize={10.5}
            textAnchor={Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end"}
            dominantBaseline="middle"
            fill="#6b675f"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── ② 环形图（占比）────────────────────────────────────
export function DonutChart({
  segments,
  size = 132,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  centerLabel?: string;
  centerValue?: number;
}) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
        </g>
        {centerValue !== undefined && (
          <text x={size / 2} y={size / 2 - 4} fontSize={22} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill="#1b1a17">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={size / 2} y={size / 2 + 14} fontSize={10} textAnchor="middle" fill="#6b675f">
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="tabular-nums text-slate-400">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── ③ 迷你趋势线（走势）────────────────────────────────
export function Sparkline({
  data,
  width = 260,
  height = 60,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const stepX = width / Math.max(1, data.length - 1);
  const y = (v: number) => height - 6 - ((v - min) / span) * (height - 12);
  const pts = data.map((v, i) => [i * stepX, y(v)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={area} fill="var(--brand)" fillOpacity={0.08} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={2.75} fill="var(--brand)" />}
    </svg>
  );
}

// ── ④ 四宫格数据卡 ─────────────────────────────────────
export function StatGrid({
  cells,
}: {
  cells: Array<{ label: string; value: string | number; spark?: number[] }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{cell.label}</div>
          <div className="mt-0.5 font-serif text-2xl font-bold tabular-nums text-slate-900">{cell.value}</div>
          {cell.spark && (
            <div className="mt-1">
              <Sparkline data={cell.spark} width={110} height={22} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── ⑤ 横向条形图（来源角色分布等）──────────────────────
export function HBarChart({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="w-full space-y-3 px-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right text-[11px] text-slate-600">{r.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-md" style={{ background: "var(--muted)" }}>
            <div
              className="h-full rounded-md transition-all duration-700"
              style={{ width: `${(r.value / max) * 100}%`, background: "var(--brand)" }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── ⑥ 时间线折线（内容按月分布，带峰值标注）─────────────
export function TrendLine({
  points,
  width = 300,
  height = 170,
}: {
  points: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
}) {
  const padX = 12;
  const padTop = 18;
  const padBottom = 22;
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = (width - padX * 2) / Math.max(1, n - 1);
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => padTop + (1 - v / max) * (height - padTop - padBottom);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${height - padBottom} L ${x(0).toFixed(1)} ${height - padBottom} Z`;
  const peakIdx = points.reduce((mi, p, i) => (p.value > points[mi].value ? i : mi), 0);
  const labelIdx = [...new Set([0, peakIdx, n - 1])];
  const monthOf = (label: string) => `${Number(label.slice(5)) || label}月`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <line x1={padX} y1={height - padBottom} x2={width - padX} y2={height - padBottom} stroke="var(--border)" strokeWidth={1} />
      <path d={area} fill="var(--brand)" fillOpacity={0.1} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === peakIdx ? 3.5 : 2} fill="var(--brand)" />
      ))}
      <text x={x(peakIdx)} y={y(points[peakIdx].value) - 8} fontSize={11} fontWeight={700} textAnchor="middle" fill="#1b1a17">
        {points[peakIdx].value}
      </text>
      {labelIdx.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={height - 7}
          fontSize={9.5}
          textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          fill="#8a857c"
        >
          {monthOf(points[i].label)}
        </text>
      ))}
    </svg>
  );
}
