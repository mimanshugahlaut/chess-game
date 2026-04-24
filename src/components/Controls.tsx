import type { GameMode, Difficulty, Side } from '../hooks/useChessGame';

interface Props {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  playerSide: Side;
  setPlayerSide: (s: Side) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  onNewGame: () => void;
  onUndo: () => void;
  onFlip: () => void;
  onLoadFen: (fen: string) => void;
  onCopyPgn: () => void;
  canUndo: boolean;
}

export default function Controls({
  mode, setMode, difficulty, setDifficulty, playerSide, setPlayerSide,
  soundOn, setSoundOn, onNewGame, onUndo, onFlip, onLoadFen, onCopyPgn, canUndo,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onNewGame}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
        >
          New Game
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-semibold disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={onFlip}
          className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-semibold"
        >
          Flip Board
        </button>
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-semibold"
        >
          Sound: {soundOn ? 'On' : 'Off'}
        </button>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">Mode</div>
        <div className="flex gap-1">
          {(['ai', 'pvp', 'aivai'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-2 py-1.5 text-xs rounded font-semibold ${
                mode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m === 'ai' ? 'vs AI' : m === 'pvp' ? '1 vs 1' : 'AI vs AI'}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'pvp' && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Difficulty</div>
          <div className="flex gap-1">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 px-2 py-1.5 text-xs rounded font-semibold capitalize ${
                  difficulty === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Play as</div>
          <div className="flex gap-1">
            {(['w', 'b'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPlayerSide(s)}
                className={`flex-1 px-2 py-1.5 text-xs rounded font-semibold ${
                  playerSide === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'w' ? 'White' : 'Black'}
              </button>
            ))}
          </div>
        </div>
      )}

      <details className="bg-gray-50 rounded-lg border border-gray-200 p-2">
        <summary className="cursor-pointer text-xs font-semibold text-gray-600">Advanced (FEN / PGN)</summary>
        <div className="mt-2 space-y-2">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Paste FEN…"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onLoadFen((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
          <button
            onClick={onCopyPgn}
            className="w-full px-2 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded font-semibold"
          >
            Copy PGN
          </button>
        </div>
      </details>
    </div>
  );
}