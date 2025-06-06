// Componente del teclado virtual musical
const MusicKeyboard = ({ onKeyPress }) => {
  const musicalChars = [
    'C', 'D', 'E', 'F', 'G', 'A', 'B',
    '#', 'b', 'm', '7', '9', '11', '13',
    'Δ', '*', 'ø', '+', '-', '(', ')',
    '/', 'sus', 'add', 'dim', 'aug'
  ];

  return (
    <div className="mt-2 w-full">
      <div className="grid grid-cols-6 gap-1.5">
        {musicalChars.map((char, idx) => (
          <button
            key={idx}
            className="px-2 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-100 w-full"
            onClick={() => onKeyPress(char)}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MusicKeyboard;