import { Move } from 'chess.js';
import { useEffect, useRef } from 'react';

interface Props { history: Move[]; }

export default function MoveHistory({ history }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history.length]);

  const rows: { n: number; w?: string; b?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: history[i]?.san, b: history[i + 1]?.san });
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="text-xs font-semibold text-gray-600 mb-2">Move History</div>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto text-sm font-mono">
        {rows.length === 0 && <div className="text-gray-400 italic">No moves yet</div>}
        {rows.map((r) => (
          <div key={r.n} className="grid grid-cols-[2rem_1fr_1fr] gap-2 py-0.5">
            <span className="text-gray-500">{r.n}.</span>
            <span className="text-gray-800">{r.w}</span>
            <span className="text-gray-800">{r.b ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}