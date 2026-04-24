import { Chess } from 'chess.js';
import {
  PAWN_MG, PAWN_EG, KNIGHT, BISHOP, ROOK, QUEEN, KING_MG, KING_EG,
  PAWN_MG_B, PAWN_EG_B, KNIGHT_B, BISHOP_B, ROOK_B, QUEEN_B, KING_MG_B, KING_EG_B,
} from './pieceSquareTables';

export const PIECE_VALUE: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Phase weights for tapered eval (total starting non-pawn material = 24)
const PHASE_WEIGHT: Record<string, number> = { n: 1, b: 1, r: 2, q: 4, p: 0, k: 0 };
const TOTAL_PHASE = 24;

export function evaluate(chess: Chess): number {
  // Return score from White's perspective (positive = White winning).
  if (chess.isCheckmate()) {
    // The side to move is mated
    return chess.turn() === 'w' ? -1000000 : 1000000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const board = chess.board();
  let mg = 0, eg = 0;
  let phase = 0;
  let whiteBishops = 0, blackBishops = 0;

  // Pawn file counts for doubled/isolated detection
  const wPawnFiles = new Array(8).fill(0);
  const bPawnFiles = new Array(8).fill(0);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const idx = r * 8 + f;
      const val = PIECE_VALUE[piece.type];
      phase += PHASE_WEIGHT[piece.type];

      if (piece.color === 'w') {
        mg += val;
        eg += val;
        switch (piece.type) {
          case 'p':
            mg += PAWN_MG[idx]; eg += PAWN_EG[idx];
            wPawnFiles[f]++;
            break;
          case 'n': mg += KNIGHT[idx]; eg += KNIGHT[idx]; break;
          case 'b': mg += BISHOP[idx]; eg += BISHOP[idx]; whiteBishops++; break;
          case 'r': mg += ROOK[idx]; eg += ROOK[idx]; break;
          case 'q': mg += QUEEN[idx]; eg += QUEEN[idx]; break;
          case 'k': mg += KING_MG[idx]; eg += KING_EG[idx]; break;
        }
      } else {
        mg -= val;
        eg -= val;
        switch (piece.type) {
          case 'p':
            mg -= PAWN_MG_B[idx]; eg -= PAWN_EG_B[idx];
            bPawnFiles[f]++;
            break;
          case 'n': mg -= KNIGHT_B[idx]; eg -= KNIGHT_B[idx]; break;
          case 'b': mg -= BISHOP_B[idx]; eg -= BISHOP_B[idx]; blackBishops++; break;
          case 'r': mg -= ROOK_B[idx]; eg -= ROOK_B[idx]; break;
          case 'q': mg -= QUEEN_B[idx]; eg -= QUEEN_B[idx]; break;
          case 'k': mg -= KING_MG_B[idx]; eg -= KING_EG_B[idx]; break;
        }
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) { mg += 30; eg += 50; }
  if (blackBishops >= 2) { mg -= 30; eg -= 50; }

  // Doubled & isolated pawns
  for (let f = 0; f < 8; f++) {
    if (wPawnFiles[f] > 1) { mg -= 15 * (wPawnFiles[f] - 1); eg -= 25 * (wPawnFiles[f] - 1); }
    if (bPawnFiles[f] > 1) { mg += 15 * (bPawnFiles[f] - 1); eg += 25 * (bPawnFiles[f] - 1); }
    const wIsolated = wPawnFiles[f] > 0 && (f === 0 || wPawnFiles[f-1] === 0) && (f === 7 || wPawnFiles[f+1] === 0);
    const bIsolated = bPawnFiles[f] > 0 && (f === 0 || bPawnFiles[f-1] === 0) && (f === 7 || bPawnFiles[f+1] === 0);
    if (wIsolated) { mg -= 10; eg -= 20; }
    if (bIsolated) { mg += 10; eg += 20; }
  }

  // Mobility (approximate — count moves for side to move; flip sign later)
  const stm = chess.turn();
  const myMoves = chess.moves().length;
  const mobilityScore = myMoves * 2;
  // We can't cheaply get opponent's move count without mutating board, so just bias current side
  if (stm === 'w') { mg += mobilityScore; eg += mobilityScore / 2; }
  else { mg -= mobilityScore; eg -= mobilityScore / 2; }

  // Tapered eval interpolation
  const phaseClamped = Math.min(phase, TOTAL_PHASE);
  const mgWeight = phaseClamped;
  const egWeight = TOTAL_PHASE - phaseClamped;
  const score = (mg * mgWeight + eg * egWeight) / TOTAL_PHASE;

  return score;
}