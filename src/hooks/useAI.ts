import { useEffect, useRef, useState, useCallback } from 'react';
import type { Difficulty } from './useChessGame';

const DEPTH: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 5 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 500, medium: 1500, hard: 5000 };

export interface AiResult {
  move: string;
  score: number;
  depthReached: number;
  nodes: number;
  book: boolean;
}

export function useAI() {
  const workerRef = useRef<Worker | null>(null);
  const [thinking, setThinking] = useState(false);
  const resolverRef = useRef<((r: AiResult) => void) | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../engine/aiWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      setThinking(false);
      resolverRef.current?.(e.data as AiResult);
      resolverRef.current = null;
    };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  const requestMove = useCallback((fen: string, difficulty: Difficulty, useBook: boolean): Promise<AiResult> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return;
      setThinking(true);
      resolverRef.current = resolve;
      workerRef.current.postMessage({
        fen,
        depth: DEPTH[difficulty],
        timeLimitMs: TIME_LIMIT[difficulty],
        useBook,
      });
    });
  }, []);

  return { requestMove, thinking };
}