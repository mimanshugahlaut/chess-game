import { useMemo, useState, useCallback } from 'react';
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';

interface Props {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  getLegalMoves: (square: string) => string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  turn: 'w' | 'b';
  flipped: boolean;
  disabled: boolean;
  boardSize: number;
}

export default function ChessBoard({
  fen, onMove, getLegalMoves, lastMove, isCheck, turn, flipped, disabled, boardSize,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  const kingSquare = useMemo(() => {
    if (!isCheck) return null;
    const chess = new Chess(fen);
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === turn) {
          return String.fromCharCode(97 + f) + (8 - r);
        }
      }
    }
    return null;
  }, [fen, isCheck, turn]);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: 'rgba(255, 235, 59, 0.35)' };
      styles[lastMove.to] = { background: 'rgba(255, 235, 59, 0.5)' };
    }
    if (selected) {
      styles[selected] = { background: 'rgba(30, 144, 255, 0.4)' };
    }
    for (const t of legalTargets) {
      styles[t] = {
        ...(styles[t] || {}),
        background: `radial-gradient(circle, rgba(0,0,0,0.25) 22%, transparent 24%)`,
      };
    }
    if (kingSquare) {
      styles[kingSquare] = {
        ...(styles[kingSquare] || {}),
        background: 'rgba(255, 0, 0, 0.55)',
      };
    }
    return styles;
  }, [selected, legalTargets, lastMove, kingSquare]);

  const isPromotion = useCallback((from: string, to: string): boolean => {
    const chess = new Chess(fen);
    const piece = chess.get(from as Square);
    if (!piece || piece.type !== 'p') return false;
    const rank = to[1];
    return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
  }, [fen]);

  const attemptMove = useCallback((from: string, to: string): boolean => {
    if (disabled) return false;
    if (isPromotion(from, to)) {
      setPromotion({ from, to });
      return false;
    }
    return onMove(from, to);
  }, [disabled, isPromotion, onMove]);

  const onSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (disabled) return;
    if (selected) {
      if (square === selected) {
        setSelected(null);
        setLegalTargets([]);
        return;
      }
      if (legalTargets.includes(square)) {
        const ok = attemptMove(selected, square);
        setSelected(null);
        setLegalTargets([]);
        if (!ok) return;
        return;
      }
    }
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    if (piece && piece.color === turn) {
      setSelected(square);
      setLegalTargets(getLegalMoves(square));
    } else {
      setSelected(null);
      setLegalTargets([]);
    }
  }, [disabled, selected, legalTargets, attemptMove, fen, turn, getLegalMoves]);

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!targetSquare) return false;
    return attemptMove(sourceSquare, targetSquare);
  }, [attemptMove]);

  const options = useMemo<ChessboardOptions>(
    () => ({
      position: fen,
      boardOrientation: flipped ? 'black' : 'white',
      onSquareClick,
      onPieceDrop,
      squareStyles: customSquareStyles,
      allowDragging: !disabled,
      boardStyle: { borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
    }),
    [fen, flipped, onSquareClick, onPieceDrop, customSquareStyles, disabled],
  );

  return (
    <div className="relative" style={{ width: boardSize, height: boardSize }}>
      <Chessboard options={options} />

      {promotion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
          <div className="bg-white rounded-lg p-4 shadow-xl">
            <div className="text-sm font-semibold mb-3 text-gray-700">Choose promotion</div>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded text-2xl font-bold"
                  onClick={() => {
                    const { from, to } = promotion;
                    setPromotion(null);
                    onMove(from, to, p);
                  }}
                >
                  {p === 'q' ? '♛' : p === 'r' ? '♜' : p === 'b' ? '♝' : '♞'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}