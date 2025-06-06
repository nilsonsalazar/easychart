import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom'; 
import { Link } from "react-router-dom";
import circulos from "./circulos";
import { API_URL } from './config';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import toRoman from "./toRoman";



const SongReader = () => {
  const location = useLocation();
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [compas, setCompas] = useState("4/4");
  const [semitono, setSemitono] = useState(0);
  const [savedSongs, setSavedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");

  // Registrar la fuente
  Font.register({
    family: 'Protest Revolution',
    src: '/fonts/ProtestRevolution-Regular.ttf',
    fontWeight: 'normal',
    fontStyle: 'normal'
  });


  const transposeChord = (chord, semitones) => {
    if (!chord || chord === "-" || chord.trim() === "") return "-";
    
    const noteOrder = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteOrderFlats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    
    const baseNoteMatch = chord.match(/^[A-Ga-g][#b]?/i);
    if (!baseNoteMatch) return chord;
    
    const baseNote = baseNoteMatch[0].toUpperCase();
    const suffix = chord.slice(baseNote.length);
    
    const originalIndexSharp = noteOrder.indexOf(baseNote);
    const originalIndexFlat = noteOrderFlats.indexOf(baseNote);
    const originalIndex = originalIndexSharp !== -1 ? originalIndexSharp : originalIndexFlat;
    
    if (originalIndex === -1) return chord;
    
    let newIndex = (originalIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    
    const useSharps = originalIndexSharp !== -1 || 
                     (semitones > 0 && semitones % 12 <= 6) || 
                     (semitones < 0 && semitones % 12 >= -6);
    
    const newBaseNote = useSharps ? noteOrder[newIndex] : noteOrderFlats[newIndex];
    
    if (chord.includes('/')) {
      const [mainChord, bassNote] = chord.split('/');
      const transposedMain = transposeChord(mainChord, semitones);
      const transposedBass = transposeChord(bassNote, semitones);
      return `${transposedMain}/${transposedBass}`;
    }
    
    return newBaseNote + suffix;
  };

  const cambiarTonalidad = (nuevoTono, semitonos = 0) => {
    const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const indexActual = notas.indexOf(tono);
    const indexNuevo = notas.indexOf(nuevoTono);
    const diferenciaTotal = (indexNuevo - indexActual) + semitonos;
    
    setTono(nuevoTono);
    setSemitono(semitonos);
    
    setSecciones(prev => 
      prev.map(sec => ({
        ...sec,
        lineas: sec.lineas.map(linea => ({
          ...linea,
          compasses: linea.compasses.map(compass => ({
            ...compass,
            acordes: compass.acordes.map(acorde => ({
              ...acorde,
              valor: acorde.valor ? transposeChord(acorde.valor, diferenciaTotal) : ""
            }))
          }))
        }))
      }))
    );
  };

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch(`${API_URL}/songs`);
        const data = await response.json();
        if (response.ok) {
          setSavedSongs(data);
          if (searchTerm) {
            const filtered = data.filter(song =>
              song.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredSongs(filtered);
            setShowSongDropdown(filtered.length > 0);
          }
        }
      } catch (error) {
        console.error('Error al cargar canciones:', error);
      }
    };

    fetchSongs();
  }, []);

  const ajustarSemitono = (delta) => {
    const nuevoSemitono = semitono + delta;
    setSemitono(nuevoSemitono);
    
    const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const indexActual = notas.indexOf(tono);
    const diferenciaTotal = nuevoSemitono;
    
    setSecciones(prev => 
      prev.map(sec => ({
        ...sec,
        lineas: sec.lineas.map(linea => ({
          ...linea,
          compasses: linea.compasses.map(compass => ({
            ...compas,
            acordes: compass.acordes.map(acorde => ({
              ...acorde,
              valor: transposeChord(acorde.valor, diferenciaTotal)
            }))
          }))
        }))
      }))
    );
  };
const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const loadSong = async (songId) => {
    try {
      const response = await fetch(`${API_URL}?id=${songId}&_=${Date.now()}`);
      const song = await response.json();
      
      if (song.error) {
        alert(song.error);
        return;
      }
      
      // Resetear el estado con los datos exactos de la canción
      setTituloCancion(song.title);
      setTono(song.key_signature);
      setTempo(song.tempo);
      //setCompas(song.time_signature);
      setSemitono(0); // Resetear semitono a 0 al cargar
      setSelectedSongId(songId);
      
  
      // Cargar las secciones exactamente como están en la base de datos
      const loadedSections = song.song_data?.sections?.map(section => ({
        ...section,
        lineas: section.lineas?.map(line => ({
          ...line,
          repetir: line.repetir || false,
          compasses: line.compasses?.map(measure => ({
            ...measure,
            acordes: measure.acordes?.map(chord => ({
              ...chord,
              valor: chord.valor || "" // Cargar el valor exacto sin transponer
            })) || Array(1).fill("").map(() => ({ id: generarId("division"), valor: "" }))
          })) || Array(4).fill("").map(() => ({
            id: generarId("compas"),
            divisiones: 1,
            acordes: Array(1).fill("").map(() => ({ id: generarId("division"), valor: "" }))
          }))
        })) || [
          {
            id: generarId("seccion"),
            nombre: "Sección A",
            lineas: [
              {
                id: generarId("linea"),
                repetir: false,
                compasses: Array(4).fill("").map(() => ({
                  id: generarId("compas"),
                  divisiones: 1,
                  acordes: Array(1).fill("").map(() => ({ id: generarId("division"), valor: "" }))
                }))
              }
            ]
          }
        ]
      }));
      
      setSecciones(loadedSections || [
        {
          id: generarId("seccion"),
          nombre: "Sección A",
          lineas: [
            {
              id: generarId("linea"),
              repetir: false,
              compasses: Array(4).fill("").map(() => ({
                id: generarId("compas"),
                divisiones: 1,
                acordes: Array(1).fill("").map(() => ({ id: generarId("division"), valor: "" }))
              }))
            }
          ]
        }
      ]);
      
    } catch (error) {
      console.error('Error al cargar la canción:', error);
      alert('Error al cargar la canción');
    }
  };
  const searchSongs = async (searchTerm) => {
    try {
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }
      const data = await response.json();
      console.log('Resultados de búsqueda:', data); // Agrega este log
      return Array.isArray(data) ? data : []; // Asegurar que siempre devuelva un array
    } catch (error) {
      console.error('Error buscando canciones:', error);
      return [];
    }
  };
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredSongs([]);
      setShowSongDropdown(false);
      return;
    }

    if (term.length < 5) {
      const normalize = str =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const words = normalize(term).split(/\s+/).filter(Boolean);

      const localResults = savedSongs.filter(song => {
        const title = normalize(song.title);
        return words.every(word => title.includes(word));
      });
      setFilteredSongs(localResults);
      setShowSongDropdown(localResults.length > 0);
      return;
    }

    try {
      const response = await searchSongs(term);
      setFilteredSongs(response);
      setShowSongDropdown(response.length > 0);
    } catch (error) {
      console.error("Error en la búsqueda:", error);
      setFilteredSongs([]);
      setShowSongDropdown(false);
    }
  };

useEffect(() => {
  const fetchSongs = async () => {
    try {
      const response = await fetch(`${API_URL}/songs?_=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        setSavedSongs(data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchSongs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      {/* Header simplificado */}
      <header className="sticky top-0 z-10 bg-white shadow-sm py-4 px-6 rounded-xl mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Protest Revolution' }}>
            {tituloCancion || "Lector de Charts"}
          </h1>
          <Link 
            to="/crear"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Crear o Editar Canción
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Panel de controles */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar canción..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showSongDropdown && filteredSongs.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredSongs.map(song => (
                  <div 
                    key={song.id}
                    className={`p-3 hover:bg-gray-100 cursor-pointer ${selectedSongId === song.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      loadSong(song.id);
                      setSearchTerm(song.title);
                      setSelectedSongId(song.id);
                      setShowSongDropdown(false);
                    }}
                  >
                    <div className="font-medium">{song.title}</div>
                    <div className="text-sm text-gray-600">
                      {song.key_signature} • {song.tempo} BPM
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controles de tonalidad */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tonalidad</label>
              <select
                value={tono}
                onChange={e => cambiarTonalidad(e.target.value, semitono)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(circulos).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Compás</label>
              <select
                value={compas}
                onChange={(e) => setCompas(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ajuste fino</label>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => ajustarSemitono(-1)} 
                  className="p-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  {semitono === 0 ? "Original" : `${semitono > 0 ? '+' : ''}${semitono/2}`}
                </div>
                <button 
                  onClick={() => ajustarSemitono(1)} 
                  className="p-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Botón Exportar */}
          <PDFDownloadLink 
            document={<SongPDF title={tituloCancion} sections={secciones} keySignature={tono} tempo={tempo} compas={compas} />}
            fileName={`${tituloCancion || 'partitura'}.pdf`}
            className="block w-full text-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Exportar a PDF
          </PDFDownloadLink>
        </div>

        {/* Visualización estilo PDF */}
<div className="bg-white rounded-xl shadow-sm p-8" style={{ 
  fontFamily: 'Protest Revolution',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
}}>
  {/* Encabezado del Chart*/}
  <div className="text-center mb-8">
    <h2 className="text-3xl font-bold mb-2">{tituloCancion || "Canción"}</h2>
    <p className="text-lg text-gray-600">
      Tonalidad: {tono} • Compás: {compas} • Tempo: {tempo}
    </p>
  </div>

  {/* Secciones de la canción */}
  {secciones.map((sec, secIdx) => (
    <div key={secIdx} className="mb-10">
      <h3 className="text-xl font-bold border-b border-gray-300 pb-1 mb-6">
        {sec.nombre} • {sec.compas}
      </h3>
      
      {sec.lineas.map((linea, lIdx) => {
        let measureCount = 0;
        for (let i = 0; i < lIdx; i++) {
          measureCount += sec.lineas[i].compasses.length;
        }
        
        return (
          <div key={lIdx} className="mb-8 flex items-center">
            {/* Símbolo de repetición al inicio */}
            {linea.repetir && <span className="text-2xl mx-2">||:</span>}
            
            {/* Línea de 4 compasses distribuidos equitativamente */}
            <div className="flex justify-evenly gap-0 flex-1">
              {linea.compasses.map((compass, cIdx) => {
                measureCount++;
                const divisiones = compass.acordes.length;

                return (
                  <div key={cIdx} className="relative w-1/4 border-l border-r border-black">


                    {/* Número de compás */}
                    <div className="absolute -top-5 left-0 right-0 text-center">
                      <span className="text-xs text-gray-500">{toRoman(measureCount)}</span>
                    </div>

                    {/* Acordes distribuidos equitativamente en el compás */}
                    <div
                      className={`grid gap-2`}
                      style={{
                        gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`,
                        textAlign: 'center',
                      }}
                    >
                      {compass.acordes.map((acorde, dIdx) => (
                        <div key={dIdx} className="py-1 text-lg">
                          {acorde.valor || "-"}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Símbolo de cierre de repetición */}
            {linea.repetir && <span className="text-2xl mx-2">:||</span>}
          </div>
        );
      })}
    </div>
  ))}
</div>
      </div>
    </div>
  );
};

export default SongReader;