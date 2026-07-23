import MusicKeyboard from './MusicKeyboard';

const ChordModal = ({
  isOpen,
  onClose,
  onChordSelect,
  tono,
  acordesDisponibles
}) => {
  if (!isOpen) return null;

  const handleCustomChord = () => {
    const input = document.getElementById('customChordInput');
    if (input.value.trim()) {
      onChordSelect(input.value.trim());
      input.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Seleccionar acorde en {tono}</h3>
        </div>

        <div className="overflow-y-auto p-6">
          {/* Acordes predefinidos */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Acordes comunes</h4>
            <div className="grid grid-cols-3 gap-2">
              {acordesDisponibles.map((ac, idx) => (
                <button
                  key={idx}
                  className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-100 text-sm font-medium"
                  style={{ fontFamily: 'Architects Daughter' }}
                  onClick={() => onChordSelect(ac)}
                >
                  {ac}
                </button>
              ))}
            </div>
          </div>

          {/* Entrada manual */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Acorde personalizado</label>
            <div className="flex rounded-lg shadow-sm">
              <input
                type="text"
                id="customChordInput"
                className="flex-1 min-w-0 block w-full rounded-l-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                placeholder="Ej: C#m7, G7sus4, etc."
                style={{ fontFamily: 'Architects Daughter' }}
                onClick={(e) => {
                  const keyboard = document.getElementById('musicKeyboard');
                  if (keyboard) keyboard.classList.remove('hidden');
                  e.stopPropagation();
                }}
              />
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleCustomChord}
              >
                Usar
              </button>
            </div>
          </div>

          {/* Teclado virtual */}
          <div id="musicKeyboard" className="hidden">
            <MusicKeyboard
              onKeyPress={(char) => {
                const input = document.getElementById('customChordInput');
                input.value = (input.value || '') + char;
                input.focus();
              }}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChordModal;