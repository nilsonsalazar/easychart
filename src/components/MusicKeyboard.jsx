import React from 'react';

const MusicKeyboard = ({ onKeyPress }) => {
  const rows = [
    ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    ['#', 'b', 'm', '7', '9', '11', '13'],
    ['Δ', '*', 'ø', '+', '-', '(', ')'],
    ['/', 'sus', 'add', 'dim', 'aug']
  ];

  return (
    <div className="w-full bg-stone-200/60 p-2 rounded-xl border border-stone-300/70 space-y-1">
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="flex gap-1 w-full">
          {row.map((char, idx) => (
            <button
              key={idx}
              type="button"
              className="flex-1 py-1.5 px-0.5 bg-[#EAEAEA] hover:bg-[#383023] text-stone-800 hover:text-[#D8B45A] rounded-lg text-xs font-bold font-mono transition-colors shadow-sm active:scale-95 border border-stone-300/50"
              onClick={(e) => {
                e.preventDefault();
                onKeyPress(char);
              }}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MusicKeyboard;