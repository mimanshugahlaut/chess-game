import { useState, useCallback, useRef, useMemo } from 'react';
import { Chess, Move, type Square } from 'chess.js';

export type GameMode = 'ai' | 'pvp' | 'aivai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Side = 'w' | 'b';

export interface LastMove { from: string; to: string; }

const START_FEN = new Chess().fen();

export function useChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const syncStateFromGame = useCallback(() => {
    setFen(gameRef.current.fen());
    const h = gameRef.current.history({ verbose: true });
    setHistory([...h]);
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }, []);

  const gameSnapshot = useMemo(() => new Chess(fen), [fen]);

  const makeMove = useCallback((from: string, to: string, promotion?: string): Move | null => {
    try {
      const move = gameRef.current.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) return null;
      syncStateFromGame();
      return move;
    } catch {
      return null;
    }
  }, [syncStateFromGame]);

  const makeMoveSan = useCallback((san: string): Move | null => {
    try {
      const move = gameRef.current.move(san);
      if (!move) return null;
      syncStateFromGame();
      return move;
    } catch {
      return null;
    }
  }, [syncStateFromGame]);

  const undo = useCallback((halfMoves: number = 1) => {
    for (let i = 0; i < halfMoves; i++) gameRef.current.undo();
    syncStateFromGame();
  }, [syncStateFromGame]);

  const reset = useCallback((newFen?: string) => {
    gameRef.current = new Chess(newFen);
    syncStateFromGame();
  }, [syncStateFromGame]);

  const loadFen = useCallback((newFen: string): boolean => {
    try {
      const c = new Chess(newFen);
      gameRef.current = c;
      syncStateFromGame();
      return true;
    } catch {
      return false;
    }
  }, [syncStateFromGame]);

  const getLegalMoves = useCallback((square: string): string[] => {
    const moves = gameRef.current.moves({ square: square as Square, verbose: true }) as Move[];
    return moves.map((m) => m.to);
  }, []);

  const getPgn = useCallback(() => gameRef.current.pgn(), []);

  return {
    game: gameSnapshot,
    fen,
    history,
    lastMove,
    turn: gameSnapshot.turn() as Side,
    isGameOver: gameSnapshot.isGameOver(),
    isCheck: gameSnapshot.inCheck(),
    isCheckmate: gameSnapshot.isCheckmate(),
    isStalemate: gameSnapshot.isStalemate(),
    isDraw: gameSnapshot.isDraw(),
    isThreefold: gameSnapshot.isThreefoldRepetition(),
    isInsufficient: gameSnapshot.isInsufficientMaterial(),
    makeMove,
    makeMoveSan,
    undo,
    reset,
    loadFen,
    getLegalMoves,
    getPgn,
  };
}