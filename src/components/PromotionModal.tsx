import React from 'react';

interface PromotionModalProps {
  isOpen: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Promote Pawn</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { piece: 'q' as const, label: 'Queen' },
            { piece: 'r' as const, label: 'Rook' },
            { piece: 'b' as const, label: 'Bishop' },
            { piece: 'n' as const, label: 'Knight' },
          ].map(({ piece, label }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition text-2xl"
            >
              {label[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};