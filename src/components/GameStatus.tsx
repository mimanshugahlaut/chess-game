import { Move } from 'chess.js';

interface Props {
  turn: 'w' | 'b';
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isThreefold: boolean;
  isInsufficient: boolean;
  isCheck: boolean;
  history: Move[];
  thinking: boolean;
}

const PIECE_VALS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const PIECE_SYM: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
};

export default function GameStatus({
  turn, isCheckmate, isStalemate, isDraw, isThreefold, isInsufficient, isCheck, history, thinking,
}: Props) {
  // Compute captured
  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];
  for (const m of history) {
    if (m.captured) {
      if (m.color === 'w') capturedByWhite.push(m.captured);
      else capturedByBlack.push(m.captured);
    }
  }
  const whiteMat = capturedByWhite.reduce((s, p) => s + (PIECE_VALS[p] || 0), 0);
  const blackMat = capturedByBlack.reduce((s, p) => s + (PIECE_VALS[p] || 0), 0);
  const matDiff = whiteMat - blackMat;

  let banner = '';
  let bannerClass = '';
  if (isCheckmate) {
    banner = `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins`;
    bannerClass = 'bg-red-100 text-red-800 border-red-300';
  } else if (isStalemate) {
    banner = 'Stalemate — Draw';
    bannerClass = 'bg-gray-100 text-gray-800 border-gray-300';
  } else if (isThreefold) {
    banner = 'Draw by threefold repetition';
    bannerClass = 'bg-gray-100 text-gray-800 border-gray-300';
  } else if (isInsufficient) {
    banner = 'Draw by insufficient material';
    bannerClass = 'bg-gray-100 text-gray-800 border-gray-300';
  } else if (isDraw) {
    banner = 'Draw (50-move rule)';
    bannerClass = 'bg-gray-100 text-gray-800 border-gray-300';
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div className={`border rounded-lg px-4 py-3 font-semibold ${bannerClass}`}>{banner}</div>
      )}
      {!banner && (
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${turn === 'w' ? 'bg-white border border-gray-400' : 'bg-gray-900'}`} />
          <span className="font-semibold text-gray-700">
            {turn === 'w' ? "White" : "Black"} to move
          </span>
          {isCheck && <span className="text-red-600 font-bold">(Check!)</span>}
          {thinking && <span className="text-blue-600 text-sm ml-2 animate-pulse">AI thinking…</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">White captured</div>
          <div className="min-h-[24px] text-lg">
            {capturedByWhite.map((p, i) => <span key={i}>{PIECE_SYM[p]}</span>)}
            {matDiff > 0 && <span className="ml-2 text-xs text-gray-600">+{matDiff}</span>}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Black captured</div>
          <div className="min-h-[24px] text-lg">
            {capturedByBlack.map((p, i) => <span key={i}>{PIECE_SYM[p]}</span>)}
            {matDiff < 0 && <span className="ml-2 text-xs text-gray-600">+{-matDiff}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}