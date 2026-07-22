import { useState } from 'react';

// Función utilitaria para números romanos simples
function toRoman(num) {
  if (typeof num !== "number") return "";
  const romans = ["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
  return romans[num] || num;
}

const SongSection = ({
  section,
  onDelete,
  onEditName,
  onAddLine,
  onChordChange,
  onChangeDivisions,
  tono,
  onOpenChordModal
}) => {
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header de sección */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
        {editingId === section.id ? (
          <input
            type="text"
            defaultValue={section.nombre}
            onBlur={(e) => {
              onEditName(section.id, e.target.value);
              setEditingId(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onEditName(section.id, e.target.value);
                setEditingId(null);
              }
            }}
            className="text-lg font-semibold flex-1 bg-transparent focus:outline-none"
            autoFocus
          />
        ) : (
          <h2 
            className="text-lg font-semibold text-gray-900 flex-1"
            onClick={() => setEditingId(section.id)}
          >
            {section.nombre}
          </h2>
        )}
        <button
          onClick={() => onDelete(section.id)}
          className="text-red-500 p-1 rounded-full hover:bg-red-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Contenido de la sección */}
      <div className="p-4 space-y-4">
        {section.lineas.map((linea, lIdx) => {
          let measureCount = 0;
          for (let i = 0; i < lIdx; i++) {
            measureCount += section.lineas[i].compases.length;
          }
          
          return (
            <div key={linea.id} className="space-y-3">
              <div className="flex space-x-1 overflow-x-auto pb-2 -mx-2 px-2">
                {linea.compases.map((compas, cIdx) => {
                  measureCount++;
                  return (
                    <div key={compas.id} className="flex-shrink-0 w-1/4 border border-gray-200 rounded-xl p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500">{toRoman(measureCount)}</span>
                        <select
                          value={compas.divisiones}
                          onChange={(e) => 
                            onChangeDivisions(section.id, lIdx, cIdx, parseInt(e.target.value))
                          }
                          className="text-xs rounded border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {[1, 2, 3, 4, 6, 8].map(num => (
                            <option key={num} value={num}>{num} </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        {compas.acordes.map((acorde, dIdx) => (
                          <button
                            key={acorde.id}
                            style={{ fontFamily: 'Protest Revolution' }}
                            className={`transition-all duration-150 ease-in-out 
                              min-h-[40px] px-2 py-1 text-sm rounded-lg shadow-sm
                              flex items-center justify-center 
                              ${
                                acorde.valor
                                  ? "bg-gray-900 text-white hover:bg-gray-800"
                                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-100"
                              }`}
                            onClick={() => {
                              onOpenChordModal({ 
                                seccionId: section.id, 
                                lineaIndex: lIdx, 
                                compasIndex: cIdx, 
                                divisionIndex: dIdx 
                              });
                            }}
                          >
                            {acorde.valor || ``}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        <button
          onClick={() => onAddLine(section.id)}
          className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add line (4 measures)
        </button>
      </div>
    </div>
  );
};

export default SongSection;