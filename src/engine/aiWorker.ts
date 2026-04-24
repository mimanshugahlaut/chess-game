/// <reference lib="webworker" />

import { searchBestMove, getBookMove } from './minimax';

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (e: MessageEvent) => {
  const { fen, depth, timeLimitMs, useBook } = e.data as {
    fen: string; depth: number; timeLimitMs: number; useBook: boolean;
  };

  if (useBook) {
    const bookMove = getBookMove(fen);
    if (bookMove) {
      workerScope.postMessage({ move: bookMove, score: 0, depthReached: 0, nodes: 0, book: true });
      return;
    }
  }

  const result = searchBestMove(fen, depth, timeLimitMs);
  workerScope.postMessage({ ...result, book: false });
};

export {};