import React, { useState, useEffect } from "react";
import circulos from "./circulos";
import { API_CONFIG } from './config';
import { Font } from "@react-pdf/renderer";
import MusicKeyboard from "./MusicKeyboard";
import toRoman from "./toRoman";



// Registrar la fuente
Font.register({
  family: 'Protest Revolution',
  src: '/fonts/ProtestRevolution-Regular.ttf',
  fontWeight: 'normal',
  fontStyle: 'normal'
});


export default function SongCreator() {
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [savedSongs, setSavedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  
  const [secciones, setSecciones] = useState([
    {
      id: Date.now(),
      nombre: "Section A",
      compas: "4/4",
      lineas: [
        {
          id: `${Date.now()}-linea-0`,
          repetir: false,
          compasses: Array.from({ length: 4 }, (_, cIdx) => ({
            id: `${Date.now()}-compass-${cIdx}`,
            divisiones: 1,
            acordes: Array(1).fill("").map((_, i) => ({ 
              id: `${Date.now()}-div-${cIdx}-${i}`, 
              valor: "" 
            }))
          }))
        }
      ]
    }
  ]);

  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
  const [editingSeccionId, setEditingSeccionId] = useState(null);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");

  const STORAGE_KEY = 'easychart_songs_v1';

  const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const readLocalSongs = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading local songs:', error);
      return [];
    }
  };

  const writeLocalSongs = (songs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch (error) {
      console.error('Error saving local songs:', error);
    }
  };

  const syncSavedSongList = (song, mode = 'append') => {
    const localSongs = readLocalSongs();
    const updatedSongs = mode === 'append'
      ? [...localSongs, song]
      : localSongs.map(existingSong => existingSong.id === song.id ? song : existingSong);

    writeLocalSongs(updatedSongs);
    setSavedSongs(updatedSongs);

    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase();
      const filtered = updatedSongs.filter(item =>
        (item.title || '').toLowerCase().includes(normalizedSearch)
      );
      setFilteredSongs(filtered);
      setShowSongDropdown(filtered.length > 0);
    }
  };

  const transposeChord = (chord, semitones, currentKey) => {
  if (!chord || chord === "-" || chord.trim() === "") return "-";

  const noteOrderSharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteOrderFlats = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  
  // Definir qué tonalidades deben usar bemoles (♭)
  const flatKeys = ["D♭", "E♭", "G♭", "A♭", "B♭"];
  
  // Determinar si debemos usar bemoles para la tonalidad actual
  const useFlats = flatKeys.includes(currentKey);

  const baseNoteMatch = chord.match(/^[A-Ga-g](#|♭)?/);
  if (!baseNoteMatch) return chord;

  const baseNote = baseNoteMatch[0];
  const suffix = chord.slice(baseNote.length);

  const noteOrder = useFlats ? noteOrderFlats : noteOrderSharps;
  const originalIndex = noteOrderSharps.includes(baseNote) 
    ? noteOrderSharps.indexOf(baseNote) 
    : noteOrderFlats.indexOf(baseNote);

  if (originalIndex === -1) return chord;

  let newIndex = (originalIndex + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  // Siempre usar la notación correcta (bemoles para flatKeys)
  let newBaseNote = useFlats ? noteOrderFlats[newIndex] : noteOrderSharps[newIndex];

  if (chord.includes('/')) {
    const [mainChord, bassNote] = chord.split('/');
    const transposedMain = transposeChord(mainChord, semitones, currentKey);
    const transposedBass = transposeChord(bassNote, semitones, currentKey);
    return `${transposedMain}/${transposedBass}`;
  }

  return newBaseNote + suffix;
};

const cambiarTonalidad = (nuevoTono, semitonos = 0) => {
  const notas = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
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
            valor: acorde.valor ? transposeChord(acorde.valor, diferenciaTotal, nuevoTono) : ""
          }))
        }))
      }))
    }))
  );
};
  // Función para ajustar semitonos
const ajustarSemitono = (delta) => {
  const nuevoSemitono = semitono + delta;
  setSemitono(nuevoSemitono);
  
  const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const indexActual = notas.indexOf(tono);
  const diferencialTotal = nuevoSemitono;
  
  setSecciones(prev =>
    prev.map(sec => ({
      ...sec,
      lineas: sec.lineas.map(linea => ({
        ...linea,
        compasses: linea.compasses.map(compass => ({
          ...compass,
          acordes: compass.acordes.map(acorde => ({
            ...acorde,
            valor: transposeChord(acorde.valor, diferencialTotal, tono)
          }))
        }))
      }))
    }))
  );
};

  const getAcordesDisponibles = () => {
    const tonoActual = circulos[tono];
    if (!tonoActual) return [];
    return tonoActual.degrees.flatMap(degree => degree.common_extensions);
  };

  // Cargar canciones al montar el componente
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch(`${API_CONFIG.FULL_URL}?_=${Date.now()}`);
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
        } else {
          console.error('Error al cargar canciones:', data.error);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        const localSongs = readLocalSongs();
        setSavedSongs(localSongs);
        if (searchTerm) {
          const filtered = localSongs.filter(song =>
            song.title.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setFilteredSongs(filtered);
          setShowSongDropdown(filtered.length > 0);
        }
      }
    };
    fetchSongs();
  }, []);




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
      const localSongs = readLocalSongs();
      const fallbackResults = localSongs.filter(song =>
        song.title.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredSongs(fallbackResults);
      setShowSongDropdown(fallbackResults.length > 0);
    }
  };

  const handleAcordeChange = (seccionId, lineaIndex, compasIndex, divisionIndex, acorde) => {
    setSecciones(prev =>
      prev.map(sec => {
        if (sec.id !== seccionId) return sec;
        
        const nuevaLinea = sec.lineas.map((linea, lIdx) => {
          if (lIdx !== lineaIndex) return linea;
          
          const nuevosCompasses = linea.compasses.map((compas, cIdx) => {
            if (cIdx !== compasIndex) return compas;
            
            const nuevosAcordes = compas.acordes.map((a, dIdx) =>
              dIdx === divisionIndex ? { ...a, valor: acorde } : a
            );
            
            return { ...compas, acordes: nuevosAcordes };
          });
          
          return { ...linea, compasses: nuevosCompasses };
        });
        
        return { ...sec, lineas: nuevaLinea };
      })
    );
    setModalData(null);
  };

  const agregarSeccion = () => {
    if (!nuevaSeccionNombre.trim()) return;
    
    const nuevaSeccion = {
      id: generarId("seccion"),
      nombre: nuevaSeccionNombre.trim(),
      compas: "4/4",
      lineas: [
        {
          id: generarId("linea"),
          repetir: false,
          compasses: Array.from({ length: 4 }, (_, cIdx) => ({
            id: generarId("compass"),
            divisiones: 1,
            acordes: Array(1).fill("").map((_, i) => ({ 
              id: generarId("division"), 
              valor: "" 
            }))
          }))
        }
      ]
    };
    
    setSecciones([...secciones, nuevaSeccion]);
    setNuevaSeccionNombre("");
  };

  const agregarLinea = (seccionId) => {
    setSecciones(prev =>
      prev.map(sec => {
        if (sec.id !== seccionId) return sec;
        return {
          ...sec,
          lineas: [
            ...sec.lineas,
            {
              id: generarId("linea"),
              repetir: false,
              compasses: Array.from({ length: 4 }, (_, cIdx) => ({
                id: generarId("compass"),
                divisiones: 1,
                acordes: Array(1).fill("").map((_, i) => ({ 
                  id: generarId("division"), 
                  valor: "" 
                }))
              }))
            }
          ]
        };
      })
    );
  };

  const cambiarDivisiones = (seccionId, lineaIndex, compasIndex, nuevasDivisiones) => {
    setSecciones(prev =>
      prev.map(sec => {
        if (sec.id !== seccionId) return sec;
        
        const nuevaLinea = sec.lineas.map((linea, lIdx) => {
          if (lIdx !== lineaIndex) return linea;
          
          const nuevosCompasses = linea.compasses.map((compas, cIdx) => {
            if (cIdx !== compasIndex) return compas;
            
            const nuevosAcordes = Array(nuevasDivisiones)
              .fill("")
              .map((_, i) =>
                i < compas.acordes.length
                  ? compas.acordes[i]
                  : { id: generarId("division"), valor: "" }
              );
            
            return { ...compas, divisiones: nuevasDivisiones, acordes: nuevosAcordes };
          });
          
          return { ...linea, compasses: nuevosCompasses };
        });
        
        return { ...sec, lineas: nuevaLinea };
      })
    );
  };

  const toggleRepetirLinea = (seccionId, lineaIndex) => {
    setSecciones(prev =>
      prev.map(sec => {
        if (sec.id !== seccionId) return sec;
        
        const nuevaLinea = sec.lineas.map((linea, lIdx) => {
          if (lIdx !== lineaIndex) return linea;
          return { ...linea, repetir: !linea.repetir };
        });
        
        return { ...sec, lineas: nuevaLinea };
      })
    );
  };

  const saveSong = async () => {
    if (!tituloCancion.trim()) {
      alert("Song title is required.");
      return;
    }

    const songData = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: tituloCancion,
      artist: artista,
      key_signature: tono,
      tempo: tempo,
      song_data: {
        sections: secciones
      }
    };
    
    try {
      const response = await fetch(API_CONFIG.FULL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(songData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(
          responseData.message ||
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      console.log('Song saved successfully:', responseData);
      setSelectedSongId(responseData.id);
      syncSavedSongList(responseData, 'append');
      alert('Song saved successfully!');
      return responseData;
    } catch (error) {
      console.error('Error al guardar la canción:', error);
      const localSongs = readLocalSongs();
      const savedLocally = { ...songData, id: songData.id || generarId('local') };
      syncSavedSongList(savedLocally, 'append');
      alert('Server is unavailable. The song was saved locally in this browser.');
      return savedLocally;
    }
  };

  const updateSong = async (songId) => {
    const songData = {
      id: songId,
      title: tituloCancion,
      artist: artista,
      key_signature: tono,
      tempo: tempo,
      song_data: {
        sections: secciones
      }
    };
    
    try {
      const response = await fetch(API_CONFIG.FULL_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songData)
      });
      
      const result = await response.json();
      console.log('Song updated:', result);
      syncSavedSongList(result, 'update');
      alert('Song updated successfully!');
    } catch (error) {
      console.error('Error updating song:', error);
      const localSongs = readLocalSongs();
      const updatedSongs = localSongs.map(song => song.id === songId ? songData : song);
      writeLocalSongs(updatedSongs);
      setSavedSongs(updatedSongs);
      alert('Server is unavailable. The song was updated locally in this browser.');
    }
  };

  const loadSong = async (songId) => {
    try {
      const response = await fetch(`${API_CONFIG.FULL_URL}?id=${songId}&_=${Date.now()}`);
      const song = await response.json();
      
      if (song.error) {
        alert(song.error);
        return;
      }
      
      setTituloCancion(song.title);
      setArtista(song.artist);
      setTono(song.key_signature);
      setTempo(song.tempo);
      setSemitono(0);
      setSelectedSongId(songId);
      
      const loadedSections = song.song_data?.sections?.map(section => ({
        ...section,
        lineas: section.lineas?.map(line => ({
          ...line,
          repetir: line.repetir || false,
          compasses: line.compasses?.map(measure => ({
            ...measure,
            acordes: measure.acordes?.map(chord => ({
              ...chord,
              valor: chord.valor || ""
            })) || Array(1).fill("").map(() => ({ 
              id: generarId("division"), 
              valor: "" 
            }))
          })) || Array(4).fill("").map(() => ({
            id: generarId("compass"),
            divisiones: 1,
            acordes: Array(1).fill("").map(() => ({ 
              id: generarId("division"), 
              valor: "" 
            }))
          }))
        })) || [
          {
            id: generarId("linea"),
            repetir: false,
            compasses: Array(4).fill("").map(() => ({
              id: generarId("compass"),
              divisiones: 1,
              acordes: Array(1).fill("").map(() => ({ 
                id: generarId("division"), 
                valor: "" 
              }))
            }))
          }
        ]
      })) || [
        {
          id: generarId("seccion"),
          nombre: "Section A",
          compas: "4/4",
          lineas: [
            {
              id: generarId("linea"),
              repetir: false,
              compasses: Array(4).fill("").map(() => ({
                id: generarId("compass"),
                divisiones: 1,
                acordes: Array(1).fill("").map(() => ({ 
                  id: generarId("division"), 
                  valor: "" 
                }))
              }))
            }
          ]
        }
      ];
      
      setSecciones(loadedSections);
    } catch (error) {
      console.error('Error loading song:', error);
      const localSongs = readLocalSongs();
      const localSong = localSongs.find(song => song.id === songId);
      if (localSong) {
        setTituloCancion(localSong.title);
        setArtista(localSong.artist);
        setTono(localSong.key_signature);
        setTempo(localSong.tempo);
        setSemitono(0);
        setSelectedSongId(songId);
        setSecciones(localSong.song_data?.sections || []);
        alert('Server is unavailable. The song was loaded from local storage.');
      } else {
        alert('Error loading song');
      }
    }
  };

  const searchSongs = async (searchTerm) => {
    try {
      const response = await fetch(`${API_CONFIG.FULL_URL}?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }
      
      const data = await response.json();
      console.log('Resultados de búsqueda:', data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error buscando canciones:', error);
      const localSongs = readLocalSongs();
      return localSongs.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  };

  const eliminarSeccion = (seccionId) => {
    setSecciones(prev => prev.filter(sec => sec.id !== seccionId));
  };

  const editarNombreSeccion = (seccionId, nuevoNombre) => {
    setSecciones(prev =>
      prev.map(sec =>
        sec.id === seccionId ? { ...sec, nombre: nuevoNombre } : sec
      )
    );
    setEditingSeccionId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header con título */}
      <header className="sticky top-0 z-10 bg-white shadow-sm py-4 px-6 rounded-xl mb-6">
        <input
          type="text"
          value={tituloCancion}
          onChange={(e) => setTituloCancion(e.target.value)}
          className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none"
          placeholder="Song title"
          style={{ fontFamily: 'Protest Revolution' }}
        />   <input
          type="text"
          value={artista}
          onChange={(e) => setArtista(e.target.value)}
          className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none"
          placeholder="Author or Artist"
          style={{ fontFamily: 'Protest Revolution' }}
        />
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controles principales */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          
          {/* Input de búsqueda de canciones */}
          <div className="relative mt-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Title or Author/Artist..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
  {/* Tonalidad */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
    <select
      value={tono}
      onChange={e => cambiarTonalidad(e.target.value, semitono)}
      className="block w-32 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-2 px-3"
    >
      {Object.keys(circulos).map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  </div>

  {/* Tempo */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Tempo</label>
    <input
      type="number"
      value={tempo}
      onChange={(e) => setTempo(e.target.value)}
      placeholder="Tempo"
      min="0"
      max="360"
      step="1"
      className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-2 px-3"
    />
  </div>

  {/* Ajuste fino */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Fine tuning</label>
    <div className="flex items-center space-x-2">
      <button
        onClick={() => ajustarSemitono(-1)}
        className="p-2 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Bajar medio tono"
      >
        ↓
      </button>
      <div className="text-center px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium min-w-[80px]">
        {semitono === 0 ? "Whole tone" : `${semitono > 0 ? '+' : ''}${semitono/2} tone${Math.abs(semitono) > 1 ? 's' : ''}`}
      </div>
      <button
        onClick={() => ajustarSemitono(1)}
        className="p-2 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Subir medio tono"
      >
        ↑
      </button>
    </div>
  </div>

  {/* Save / Update button */}
  <div>
    <button
      onClick={() => selectedSongId ? updateSong(selectedSongId) : saveSong()}  disabled={!tituloCancion.trim()}
      className="flex items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
      </svg>
      {selectedSongId ? 'Update Song' : 'Save Song'}
    </button>
  </div>

  {/* Export PDF button */}
  <div>
    <button
      onClick={() => {
        if (typeof window !== 'undefined' && tituloCancion.trim()) {
          window.print();
        }
      }}
      disabled={!tituloCancion.trim()}
      className="flex items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Print / Save as PDF
    </button>
  </div>
</div>

          </div>
        </div>
        
        
        
        {/* Song sections */}
        {secciones.map((sec, secIdx) => (
          <div key={sec.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header de sección */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              {editingSeccionId === sec.id ? (
                <input
                  type="text"
                  defaultValue={sec.nombre}
                  onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && editarNombreSeccion(sec.id, e.target.value)}
                  className="text-lg font-semibold flex-1 bg-transparent focus:outline-none"
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 
                    className="text-lg font-semibold"
                    onClick={() => setEditingSeccionId(sec.id)}
                  >
                    {sec.nombre}
                  </h3>
                  <select
                    value={sec.compas}
                    onChange={(e) => setSecciones(prev => prev.map(s =>
                      s.id === sec.id ? { ...s, compas: e.target.value } : s
                    ))}
                    className="text-sm border border-gray-300 rounded"
                  >
                    <option value="3/4">3/4</option>
                    <option value="4/4">4/4</option>
                    <option value="6/8">6/8</option>
                  </select>
                </div>
              )}
              
              <button
                onClick={() => eliminarSeccion(sec.id)}
                className="text-red-500 p-1 rounded-full hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
            
            {/* Contenido de la sección */}
            <div className="p-4 space-y-4">
              {sec.lineas.map((linea, lIdx) => {
                let measureCount = 0;
                for (let i = 0; i < lIdx; i++) {
                  measureCount += sec.lineas[i].compasses.length;
                }
                
                return (
  <div key={linea.id} className="space-y-3">
    <div className="flex items-center">
      <button
        onClick={() => toggleRepetirLinea(sec.id, lIdx)}
        className={`p-1 rounded mr-2 ${linea.repetir ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
        title="Marcar para repetición"
      >
        {linea.repetir ? '||:' : '||'}
      </button>

      <div className="flex-1 flex flex-nowrap space-x-0 overflow-x-auto pb-2 -mx-2 px-2">
        {linea.compasses.map((compas, cIdx) => {
          measureCount++;
          return (
            <div
              key={compas.id}
              className="flex-shrink-0 flex-[0_0_25%] border border-gray-200 rounded-xl p-3 bg-gray-50"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">{toRoman(measureCount)}</span>
                <select
                  value={compas.divisiones}
                  onChange={(e) =>
                    cambiarDivisiones(sec.id, lIdx, cIdx, parseInt(e.target.value))
                  }
                  className="text-xs rounded border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 6, 8].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {compas.acordes.map((acorde, dIdx) => (
                  <button
                    key={acorde.id}
                    style={{ fontFamily: 'Protest Revolution' }}
                    className={`transition-all duration-150 ease-in-out min-h-[40px] px-2 py-1 text-sm rounded-lg shadow-sm flex items-center justify-center ${
                      acorde.valor
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-100"
                    }`}
                    onClick={() => {
                      setModalData({
                        seccionId: sec.id,
                        lineaIndex: lIdx,
                        compasIndex: cIdx,
                        divisionIndex: dIdx
                      });
                    }}
                  >
                    {acorde.valor || ''}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
    
  </div>
);

              })}
              
              <button
                onClick={() => agregarLinea(sec.id)}
                className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
                Add line (4 measures)
              </button>
            </div>
          </div>
        ))}
        
        {/* Add new section */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Add new section</h2>
          <div className="flex space-x-3">
            <input
              type="text"
              value={nuevaSeccionNombre}
              onChange={(e) => setNuevaSeccionNombre(e.target.value)}
              placeholder="Section name"
              className="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
              onKeyPress={(e) => e.key === 'Enter' && agregarSeccion()}
            />
            <button
              onClick={agregarSeccion}
              disabled={!nuevaSeccionNombre.trim()}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      
      {/* Chord selection modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select chord in {tono}</h3>
            </div>
            
            <div className="overflow-y-auto p-6">
              {/* Acordes predefinidos */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Common chords</h4>
                <div className="grid grid-cols-3 gap-2">
                  {getAcordesDisponibles().map((ac, idx) => (
                    <button
                      key={idx}
                      className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-100 text-sm font-medium"
                      style={{ fontFamily: 'Protest Revolution' }}
                      onClick={() =>
                        handleAcordeChange(
                          modalData.seccionId,
                          modalData.lineaIndex,
                          modalData.compasIndex,
                          modalData.divisionIndex,
                          ac
                        )
                      }
                    >
                      {ac}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Entrada manual */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom chord</label>
                <div className="flex rounded-lg shadow-sm">
                  <input
                    type="text"
                    id="customChordInput"
                    className="flex-1 min-w-0 block w-full rounded-l-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    placeholder="Example: C#m7, G7sus4, etc."
                    style={{ fontFamily: 'Protest Revolution' }}
                    onClick={(e) => {
                      const keyboard = document.getElementById('musicKeyboard');
                      if (keyboard) keyboard.classList.remove('hidden');
                      e.stopPropagation();
                    }}
                  />
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => {
                      const input = document.getElementById('customChordInput');
                      if (input.value.trim()) {
                        handleAcordeChange(
                          modalData.seccionId,
                          modalData.lineaIndex,
                          modalData.compasIndex,
                          modalData.divisionIndex,
                          input.value.trim()
                        );
                      }
                    }}
                  >
                    Use
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
                onClick={() => setModalData(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}