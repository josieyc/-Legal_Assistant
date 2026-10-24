import { useEffect, useState } from "react";

export interface Slice { label: string; value: number; color: string }

export function Donut({ data, size = 170, center, sub }: { data: Slice[]; size?: number; center?: string; sub?: string }) {
  const [on, setOn] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setOn(true), 50); return () => clearTimeout(t); }, []);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let acc = 0;
  const h = hover != null ? data[hover] : null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f7" strokeWidth={18} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const off = acc;
            acc += len;
            return (
              <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={hover === i ? 22 : 18}
                strokeDasharray={`${on ? Math.max(0, len - 2) : 0} ${c}`} strokeDashoffset={-off} strokeLinecap="butt"
                style={{ transition: "stroke-dasharray .9s ease, stroke-width .15s" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-extrabold text-navy-900">{h ? h.value : center}</div>
            <div className="text-[11px] text-sub">{h ? h.label : sub}</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="flex items-center gap-2 text-sub">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="w-16 font-medium text-ink">{d.label}</span>
            <b className="text-navy-900">{d.value}</b>
            <span className="text-faint">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, max, suffix = "" }: { data: Slice[]; max?: number; suffix?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 50); return () => clearTimeout(t); }, []);
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-16 shrink-0 font-medium text-ink">{d.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: on ? `${(d.value / m) * 100}%` : 0, background: d.color }} />
          </div>
          <b className="w-10 text-right text-navy-900">{d.value}{suffix}</b>
        </div>
      ))}
    </div>
  );
}

export function LineArea({ labels, values, color = "#10243A", h = 150 }: { labels: string[]; values: number[]; color?: string; h?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 420, pad = 22;
  const max = Math.max(...values, 1) * 1.15;
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1), h - 24 - (v / max) * (h - 44)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h - 24} L${pts[0][0]},${h - 24} Z`;
  const id = "g" + color.slice(1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2].map((k) => <line key={k} x1={pad} x2={w - pad} y1={h - 24 - (k * (h - 44)) / 2} y2={h - 24 - (k * (h - 44)) / 2} stroke="#eef1f7" />)}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={p[0] - 20} y={0} width={40} height={h} fill="transparent" />
          <circle cx={p[0]} cy={p[1]} r={hover === i ? 6 : 4} fill="#fff" stroke={color} strokeWidth={2.5} />
          {hover === i && <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0b1f45">{values[i]}</text>}
          <text x={p[0]} y={h - 6} textAnchor="middle" fontSize={11} fill="#8a94a8">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}
