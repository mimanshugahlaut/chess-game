import { Chess, Move } from 'chess.js';
import { evaluate, PIECE_VALUE } from './evaluate';

const MATE = 1000000;

interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWER' | 'UPPER';
  bestMove?: string;
}

const tt = new Map<string, TTEntry>();
const MAX_TT_SIZE = 200000;

function ttKey(chess: Chess): string {
  // FEN without halfmove/fullmove counters to increase hits
  const parts = chess.fen().split(' ');
  return parts.slice(0, 4).join(' ');
}

function storeTT(key: string, entry: TTEntry) {
  if (tt.size >= MAX_TT_SIZE) tt.clear();
  tt.set(key, entry);
}

// MVV-LVA scoring for captures
function mvvLva(move: Move): number {
  if (!move.captured) return 0;
  const victim = PIECE_VALUE[move.captured] || 0;
  const attacker = PIECE_VALUE[move.piece] || 0;
  return victim * 10 - attacker;
}

function orderMoves(
  moves: Move[],
  ttMove: string | undefined,
  killers: string[],
  ply: number,
): Move[] {
  return moves
    .map((m) => {
      let score = 0;
      if (ttMove && m.san === ttMove) score += 100000;
      if (m.captured) score += 10000 + mvvLva(m);
      if (m.promotion) score += 9000 + (PIECE_VALUE[m.promotion] || 0);
      if (m.san === killers[ply]) score += 5000;
      if (m.san.includes('+')) score += 100;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);
}

// Quiescence: only search captures & checks to avoid horizon effect
function quiescence(chess: Chess, alpha: number, beta: number, maximizing: boolean): number {
  const standPat = evaluate(chess);

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  const moves = chess.moves({ verbose: true }) as Move[];
  const captures = moves.filter((m) => m.captured || m.promotion);
  captures.sort((a, b) => mvvLva(b) - mvvLva(a));

  for (const move of captures) {
    chess.move(move);
    const score = quiescence(chess, alpha, beta, !maximizing);
    chess.undo();

    if (maximizing) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return maximizing ? alpha : beta;
}

interface SearchCtx {
  killers: string[];
  nodes: number;
  stopAt: number;
  stopped: boolean;
}

function alphaBeta(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  ply: number,
  ctx: SearchCtx,
): number {
  ctx.nodes++;

  if (ctx.nodes % 2048 === 0 && Date.now() > ctx.stopAt) {
    ctx.stopped = true;
    return 0;
  }

  // Checkmate / stalemate
  if (chess.isCheckmate()) {
    // Side to move is mated. Return score relative to White.
    return chess.turn() === 'w' ? -MATE + ply : MATE - ply;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  if (depth <= 0) {
    return quiescence(chess, alpha, beta, maximizing);
  }

  const key = ttKey(chess);
  const ttEntry = tt.get(key);
  let ttMove: string | undefined;
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'EXACT') return ttEntry.score;
    if (ttEntry.flag === 'LOWER' && ttEntry.score >= beta) return ttEntry.score;
    if (ttEntry.flag === 'UPPER' && ttEntry.score <= alpha) return ttEntry.score;
  }
  if (ttEntry) ttMove = ttEntry.bestMove;

  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return 0;

  const ordered = orderMoves(moves, ttMove, ctx.killers, ply);

  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove: string | undefined;
  const origAlpha = alpha;

  for (const move of ordered) {
    chess.move(move);
    const score = alphaBeta(chess, depth - 1, alpha, beta, !maximizing, ply + 1, ctx);
    chess.undo();

    if (ctx.stopped) return 0;

    if (maximizing) {
      if (score > bestScore) { bestScore = score; bestMove = move.san; }
      if (bestScore > alpha) alpha = bestScore;
    } else {
      if (score < bestScore) { bestScore = score; bestMove = move.san; }
      if (bestScore < beta) beta = bestScore;
    }

    if (beta <= alpha) {
      // Killer move (quiet move that caused cutoff)
      if (!move.captured) ctx.killers[ply] = move.san;
      break;
    }
  }

  // Store in TT
  let flag: TTEntry['flag'] = 'EXACT';
  if (bestScore <= origAlpha) flag = 'UPPER';
  else if (bestScore >= beta) flag = 'LOWER';
  storeTT(key, { depth, score: bestScore, flag, bestMove });

  return bestScore;
}

export interface SearchResult {
  move: string;
  score: number;
  depthReached: number;
  nodes: number;
}

export function searchBestMove(
  fen: string,
  maxDepth: number,
  timeLimitMs: number = 5000,
): SearchResult {
  const chess = new Chess(fen);
  const maximizing = chess.turn() === 'w';
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return { move: '', score: 0, depthReached: 0, nodes: 0 };

  const ctx: SearchCtx = {
    killers: new Array(64).fill(''),
    nodes: 0,
    stopAt: Date.now() + timeLimitMs,
    stopped: false,
  };

  let bestMove = moves[0].san;
  let bestScore = 0;
  let depthReached = 0;

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -Infinity, beta = Infinity;
    let currentBest: string | undefined;
    let currentScore = maximizing ? -Infinity : Infinity;

    const key = ttKey(chess);
    const ttEntry = tt.get(key);
    const ordered = orderMoves(moves, ttEntry?.bestMove, ctx.killers, 0);

    for (const move of ordered) {
      chess.move(move);
      const score = alphaBeta(chess, depth - 1, alpha, beta, !maximizing, 1, ctx);
      chess.undo();

      if (ctx.stopped) break;

      if (maximizing) {
        if (score > currentScore) { currentScore = score; currentBest = move.san; }
        if (currentScore > alpha) alpha = currentScore;
      } else {
        if (score < currentScore) { currentScore = score; currentBest = move.san; }
        if (currentScore < beta) beta = currentScore;
      }
    }

    if (ctx.stopped) break;

    if (currentBest) {
      bestMove = currentBest;
      bestScore = currentScore;
      depthReached = depth;
      storeTT(ttKey(chess), { depth, score: bestScore, flag: 'EXACT', bestMove });
    }

    // Early exit on forced mate found
    if (Math.abs(bestScore) > MATE - 100) break;
  }

  return { move: bestMove, score: bestScore, depthReached, nodes: ctx.nodes };
}

// Simple opening book
const OPENING_BOOK: Record<string, string[]> = {
  // Starting position (White)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e4', 'd4', 'Nf3', 'c4'],
  // After 1.e4 (Black)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': ['e5', 'c5', 'e6', 'c6'],
  // After 1.d4 (Black)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': ['d5', 'Nf6'],
  // After 1.Nf3 (Black)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': ['d5', 'Nf6'],
  // After 1.c4 (Black)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -': ['e5', 'Nf6', 'c5'],
  // After 1.e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['Nf3', 'Nc3'],
  // After 1.e4 c5
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['Nf3', 'Nc3'],
  // After 1.d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c4', 'Nf3'],
  // After 1.d4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c4', 'Nf3'],
};

export function getBookMove(fen: string): string | null {
  const parts = fen.split(' ');
  const key = parts.slice(0, 4).join(' ');
  const options = OPENING_BOOK[key];
  if (options && options.length) {
    return options[Math.floor(Math.random() * options.length)];
  }
  return null;
}

export function clearTT() { tt.clear(); }