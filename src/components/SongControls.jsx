import { useState } from 'react';

const SongControls = ({ 
  tono, 
  setTono, 
  compas, 
  setCompas, 
  tempo, 
  setTempo, 
  semitono, 
  ajustarSemitono,
  cambiarTonalidad,
  onSave,
  onExport
}) => {
  const [showPDFOptions, setShowPDFOptions] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Controles principales */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
            <div className="flex space-x-3">
              <select
                value={tono}
                onChange={e => cambiarTonalidad(e.target.value)}
                className="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-2 px-3"
              >
                {Object.keys(circulos).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              <select
                value={compas}
                onChange={(e) => setCompas(e.target.value)}
                className="w-24 block rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-2 px-3"
              >
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
                <option value="6/8">6/8</option>
                <option value="7/8">7/8</option>
              </select>
              
              <input
                type="number"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="Tempo"
                min="0"
                max="360"
                step="1"
                className="w-24 block rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-2 px-3"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fine tuning</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => ajustarSemitono(-1)}
                className="p-2 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Lower semitone"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <div className="flex-1 text-center px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                {semitono === 0 ? "Whole tone" : `${semitono > 0 ? '+' : ''}${semitono/2} tone${Math.abs(semitono) > 1 ? 's' : ''}`}
              </div>
              
              <button
                onClick={() => ajustarSemitono(1)}
                className="p-2 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Raise semitone"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de exportar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
          </svg>
          Save Song
        </button>
        <button
          onClick={() => setShowPDFOptions(!showPDFOptions)}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Export to PDF
        </button>
        
        {showPDFOptions && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <PDFDownloadLink 
              document={<SongPDF title={tituloCancion} sections={secciones} keySignature={tono} tempo={tempo} compas={compas} />}
              fileName={`${tituloCancion.replace(/\s+/g, '_')}.pdf`}
              className="block w-full text-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {({ loading }) => (
                loading ? 'Preparing PDF...' : 'Download PDF now'
              )}
            </PDFDownloadLink>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongControls;