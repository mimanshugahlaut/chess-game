import { useCallback, useEffect, useRef, useState } from 'react';
import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import Controls from './components/Controls';
import { useChessGame } from './hooks/useChessGame';
import type { GameMode, Difficulty, Side } from './hooks/useChessGame';
import { useAI } from './hooks/useAI';

// Simple beep sounds via WebAudio
function playTone(freq: number, duration = 80) {
  try {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Ignore audio failures (autoplay policies or unsupported browser).
  }
}

function useBoardSize() {
  const [size, setSize] = useState(560);
  useEffect(() => {
    const recalc = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 1024;
      const maxW = mobile ? w - 32 : Math.min(560, w - 360);
      const maxH = h - (mobile ? 300 : 120);
      setSize(Math.max(280, Math.min(560, Math.min(maxW, maxH))));
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);
  return size;
}

export default function App() {
  const {
    fen, history, lastMove, turn, isGameOver, isCheck, isCheckmate,
    isStalemate, isDraw, isThreefold, isInsufficient,
    makeMove, makeMoveSan, undo, reset, loadFen, getLegalMoves, getPgn,
  } = useChessGame();

  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [playerSide, setPlayerSide] = useState<Side>('w');
  const [flipped, setFlipped] = useState(playerSide === 'b');
  const [soundOn, setSoundOn] = useState(true);

  const { requestMove, thinking } = useAI();
  const boardSize = useBoardSize();
  const aiBusyRef = useRef(false);

  // Decide if it's AI's turn
  const isAITurn = useCallback(() => {
    if (isGameOver) return false;
    if (mode === 'pvp') return false;
    if (mode === 'aivai') return true;
    return turn !== playerSide;
  }, [mode, turn, playerSide, isGameOver]);

  // Trigger AI moves
  useEffect(() => {
    if (!isAITurn() || aiBusyRef.current) return;
    aiBusyRef.current = true;

    const run = async () => {
      // Small UX delay
      await new Promise((r) => setTimeout(r, 250));
      const res = await requestMove(fen, difficulty, true);
      if (res.move) {
        const move = makeMoveSan(res.move);
        if (soundOn) playTone(move?.captured ? 520 : 660, 70);
      }
      aiBusyRef.current = false;
    };
    run();
  }, [fen, isAITurn, requestMove, makeMoveSan, difficulty, soundOn]);

  const handlePlayerMove = (from: string, to: string, promotion?: string): boolean => {
    if (mode !== 'pvp' && turn !== playerSide) return false;
    const move = makeMove(from, to, promotion);
    if (move && soundOn) playTone(move.captured ? 520 : 660, 70);
    return !!move;
  };

  const handleUndo = () => {
    if (mode === 'ai') {
      // Undo 2 halfmoves (player + AI)
      const n = Math.min(2, history.length);
      if (n > 0) undo(n);
    } else {
      if (history.length > 0) undo(1);
    }
  };

  const handleNewGame = () => {
    aiBusyRef.current = false;
    reset();
  };

  const handleLoadFen = (f: string) => {
    if (f.trim()) {
      const ok = loadFen(f.trim());
      if (!ok) alert('Invalid FEN');
    }
  };

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(getPgn() || '[No moves]');
      alert('PGN copied to clipboard');
    } catch {
      alert('Could not copy PGN');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Chess with AI</h1>
          <p className="text-sm text-gray-500">Minimax + Alpha-Beta · Iterative Deepening · Quiescence Search</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex justify-center">
            <ChessBoard
              fen={fen}
              onMove={handlePlayerMove}
              getLegalMoves={getLegalMoves}
              lastMove={lastMove}
              isCheck={isCheck}
              turn={turn}
              flipped={flipped}
              disabled={isGameOver || (mode !== 'pvp' && turn !== playerSide) || (mode === 'aivai')}
              boardSize={boardSize}
            />
          </div>

          <aside className="w-full lg:w-80 space-y-4">
            <GameStatus
              turn={turn}
              isCheckmate={isCheckmate}
              isStalemate={isStalemate}
              isDraw={isDraw}
              isThreefold={isThreefold}
              isInsufficient={isInsufficient}
              isCheck={isCheck}
              history={history}
              thinking={thinking}
            />

            <Controls
              mode={mode}
              setMode={(m) => { aiBusyRef.current = false; setMode(m); }}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              playerSide={playerSide}
              setPlayerSide={(s) => {
                setPlayerSide(s);
                setFlipped(s === 'b');
              }}
              soundOn={soundOn}
              setSoundOn={setSoundOn}
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onFlip={() => setFlipped((f) => !f)}
              onLoadFen={handleLoadFen}
              onCopyPgn={handleCopyPgn}
              canUndo={history.length > 0 && !thinking}
            />

            <MoveHistory history={history} />
          </aside>
        </div>
      </div>
    </div>
  );
}