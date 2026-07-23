import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import circulos from "./circulos";
import { API_URL, API_CONFIG } from './config';
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import MusicKeyboard from "./MusicKeyboard";
import toRoman from "./toRoman";

export default function SongCreator() {
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [savedSongs, setSavedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const handleLogout = () => {
    // 1. Eliminamos el token de autenticación
    localStorage.removeItem('easychart_token');

    // 2. Redirigimos a la raíz o refrescamos para que el App.js evalúe la sesión
    window.location.href = '/';
  };

  const tonos = [
    "C",
    "D♭",
    "D",
    "E♭",
    "E",
    "F",
    "G♭",
    "G",
    "A♭",
    "A",
    "B♭",
    "B",
  ];
  const [selectedSongId, setSelectedSongId] = useState(null);

  const [secciones, setSecciones] = useState([
    {
      id: Date.now(),
      nombre: "Sección A",
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
  const [showPDFOptions, setShowPDFOptions] = useState(false);

  const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const transposeChord = (chord, semitones, currentKey) => {
    if (!chord || chord === "-" || chord.trim() === "") return "-";

    const noteOrderSharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteOrderFlats = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

    const flatKeys = ["D♭", "E♭", "G♭", "A♭", "B♭"];
    const useFlats = flatKeys.includes(currentKey);

    const baseNoteMatch = chord.match(/^[A-Ga-g](#|♭)?/);
    if (!baseNoteMatch) return chord;

    const baseNote = baseNoteMatch[0];
    const suffix = chord.slice(baseNote.length);

    const originalIndex = noteOrderSharps.includes(baseNote)
      ? noteOrderSharps.indexOf(baseNote)
      : noteOrderFlats.indexOf(baseNote);

    if (originalIndex === -1) return chord;

    let newIndex = (originalIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    let newBaseNote = useFlats ? noteOrderFlats[newIndex] : noteOrderSharps[newIndex];

    if (chord.includes('/')) {
      const [mainChord, bassNote] = chord.split('/');
      const transposedMain = transposeChord(mainChord, semitones, currentKey);
      const transposedBass = transposeChord(bassNote, semitones, currentKey);
      return `${transposedMain}/${transposedBass}`;
    }

    return newBaseNote + suffix;
  };

  const cambiarTonalidad = (nuevoTono) => {
    const notas = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
    const indexActual = notas.indexOf(tono) !== -1 ? notas.indexOf(tono) : 0;
    const indexNuevo = notas.indexOf(nuevoTono) !== -1 ? notas.indexOf(nuevoTono) : 0;
    const semitones = indexNuevo - indexActual;

    setTono(nuevoTono);
    setSemitono(0);

    if (semitones !== 0) {
      setSecciones(prev =>
        prev.map(sec => ({
          ...sec,
          lineas: (sec.lineas || []).map(linea => ({
            ...linea,
            compasses: (linea.compasses || []).map(compass => ({
              ...compass,
              acordes: (compass.acordes || []).map(acorde => ({
                ...acorde,
                valor: acorde.valor ? transposeChord(acorde.valor, semitones, nuevoTono) : ""
              }))
            }))
          }))
        }))
      );
    }
  };

  const ajustarSemitono = (delta) => {
    const nuevoSemitono = semitono + delta;
    setSemitono(nuevoSemitono);

    setSecciones(prev =>
      prev.map(sec => ({
        ...sec,
        lineas: (sec.lineas || []).map(linea => ({
          ...linea,
          compasses: (linea.compasses || []).map(compass => ({
            ...compass,
            acordes: (compass.acordes || []).map(acorde => ({
              ...acorde,
              valor: acorde.valor ? transposeChord(acorde.valor, delta, tono) : ""
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

  // useEffect con autenticación
  useEffect(() => {
    const fetchSongs = async () => {
      const token = localStorage.getItem('easychart_token');
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('easychart_token');
          window.location.reload();
          return;
        }

        const data = await response.json();
        const songList = Array.isArray(data) ? data : (data.data || []);

        if (response.ok) {
          setSavedSongs(songList);
          if (searchTerm) {
            const filtered = songList.filter(song =>
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
      }
    };
    fetchSongs();
  }, [searchTerm]);

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
        const title = normalize(song.title || "");
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

  // Petición POST con token JWT
  const saveSong = async () => {
    if (!tituloCancion.trim()) {
      alert("Por favor, ingresa el título de la canción antes de guardar.");
      return;
    }
    const songData = {
      title: tituloCancion,
      artist: artista,
      key_signature: tono,
      tempo: tempo,
      time_signature: secciones[0]?.compas || "4/4",
      song_data: {
        artist: artista,
        sections: secciones
      }
    };

    const token = localStorage.getItem('easychart_token');

    try {
      const response = await fetch(API_CONFIG.FULL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(songData)
      });

      if (response.status === 401) {
        localStorage.removeItem('easychart_token');
        window.location.reload();
        return;
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || responseData.message ||
          `Error ${response.status}: ${response.statusText}`
        );
      }

      if (responseData.id) {
        setSelectedSongId(responseData.id);
      }
      alert('¡Canción guardada exitosamente!');
      return responseData;
    } catch (error) {
      console.error('Error al guardar la canción:', error);
      alert(`Error al guardar la canción: ${error.message || 'Ocurrió un error al comunicarse con el servidor'}`);
    }
  };

  // Petición PUT con token JWT
  const updateSong = async (songId) => {
    if (!tituloCancion.trim()) {
      alert("Por favor, ingresa el título de la canción antes de actualizar.");
      return;
    }
    const songData = {
      id: songId,
      title: tituloCancion,
      artist: artista,
      key_signature: tono,
      tempo: tempo,
      time_signature: secciones[0]?.compas || "4/4",
      song_data: {
        artist: artista,
        sections: secciones
      }
    };

    const token = localStorage.getItem('easychart_token');

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(songData)
      });

      if (response.status === 401) {
        localStorage.removeItem('easychart_token');
        window.location.reload();
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al actualizar');
      }
      alert('¡Canción actualizada exitosamente!');
    } catch (error) {
      console.error('Error updating song:', error);
      alert(`Error al actualizar la canción: ${error.message || 'Error de conexión'}`);
    }
  };

  // Petición GET individual con token JWT
  const loadSong = async (songId) => {
    const token = localStorage.getItem('easychart_token');
    try {
      const response = await fetch(`${API_URL}?id=${songId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('easychart_token');
        window.location.reload();
        return;
      }

      const responseData = await response.json();
      const song = responseData.data || responseData;

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
            nombre: "Sección A",
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
      console.error('Error al cargar la canción:', error);
      alert('Error al cargar la canción');
    }
  };

  // Búsqueda remota con token JWT
  const searchSongs = async (searchTerm) => {
    const token = localStorage.getItem('easychart_token');
    try {
      const response = await fetch(`${API_URL}?search=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('easychart_token');
        window.location.reload();
        return [];
      }

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const resData = await response.json();
      const data = resData.data || resData;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error buscando canciones:', error);
      return [];
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
      {/* Header con marca EasyChart y títulos */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur shadow-sm py-4 px-6 rounded-2xl mb-6 border border-gray-100">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Protest Revolution, sans-serif' }}>
              EasyChart
            </span>
          </div>

          <Link
            to="/"
            className="flex items-center px-3.5 py-1.5 bg-gray-100 text-gray-700 font-medium text-xs rounded-xl hover:bg-gray-200 transition-all"
          >
            ← Volver a Consulta
          </Link>
          {/* BOTÓN DE LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center px-3.5 py-2.5 bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 font-medium text-sm rounded-xl transition-all border border-gray-200 cursor-pointer"
            title="Cerrar Sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        <div className="space-y-1">
          <input
            type="text"
            value={tituloCancion}
            onChange={(e) => setTituloCancion(e.target.value)}
            className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none placeholder-gray-400"
            placeholder="Título de la canción"
            style={{ fontFamily: 'Protest Revolution' }}
          />
          <input
            type="text"
            value={artista}
            onChange={(e) => setArtista(e.target.value)}
            className="text-lg font-semibold w-full text-center bg-transparent focus:outline-none text-gray-600 placeholder-gray-400"
            placeholder="Autor o Artista"
            style={{ fontFamily: 'Protest Revolution' }}
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controles principales */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>

          {/* Input de búsqueda de canciones */}
          <div className="relative mt-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Titulo o Autor/Artista..."
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

          <div className="space-y-4 pt-2">
            {/* Fila de Botones para cambiar Tonalidad */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Tonalidad Directa
                </label>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                </span>
              </div>

              {/* Grid de Botones de Tono */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowToneMenu(!showToneMenu)}
                  className="flex items-center justify-between w-full sm:w-64 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow hover:shadow-lg transition"
                >
                  <span>
                    🎵 Tono: <strong>{tono}</strong>
                  </span>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-5 h-5 transition-transform ${showToneMenu ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showToneMenu && (
                  <div className="absolute z-50 mt-2 w-full sm:w-72 rounded-2xl border bg-white shadow-2xl p-3">
                    <p className="text-xs text-gray-500 mb-3">
                      Selecciona una tonalidad
                    </p>

                    <div className="grid grid-cols-4 gap-2">
                      {tonos.map((t) => {
                        const activo = tono === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              cambiarTonalidad(t);
                              setShowToneMenu(false);
                            }}
                            className={`py-2 rounded-xl font-bold transition ${activo
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 hover:bg-blue-100"
                              }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              {/* Tempo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tempo (BPM)</label>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Tempo"
                  min="0"
                  max="360"
                  step="1"
                  className="w-28 rounded-xl border-gray-200 bg-gray-50 py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Botones de Subir / Bajar Tono */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => ajustarSemitono(-1)}
                  className="flex items-center space-x-1.5 py-2 px-3 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-gray-800 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Bajar medio tono (-1 semitono)"
                >
                  <span className="w-5 h-5 rounded-md bg-blue-100 group-hover:bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-black">
                    ♭
                  </span>
                  <span>Bajar Tono (-1 st)</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="flex items-center space-x-1.5 py-2 px-3 bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-gray-800 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Subir medio tono (+1 semitono)"
                >
                  <span>Subir Tono (+1 st)</span>
                  <span className="w-5 h-5 rounded-md bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-black">
                    ♯
                  </span>
                </button>
              </div>
            </div>

            {/* Acciones principales: Guardar y PDF */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => selectedSongId ? updateSong(selectedSongId) : saveSong()}
                className="flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
                {selectedSongId ? 'Actualizar Canción' : 'Guardar Canción'}
              </button>

              <button
                onClick={() => {
                  if (!tituloCancion.trim()) {
                    alert("Por favor, ingresa el título de la canción para exportar a PDF.");
                    return;
                  }
                  setShowPDFOptions(!showPDFOptions);
                }}
                className="flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {showPDFOptions ? 'Ocultar PDF' : 'Exportar a PDF'}
              </button>
            </div>

            {/* Panel de opciones PDF */}
            {showPDFOptions && (
              <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                <PDFDownloadLink
                  document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                  fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                  className="block w-full text-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {({ loading, error }) => (
                    loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        </div>

        {/* Secciones de la canción */}
        {secciones.map((sec, secIdx) => (
          <div key={sec.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {/* Header de sección */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              {editingSeccionId === sec.id ? (
                <input
                  type="text"
                  defaultValue={sec.nombre}
                  onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && editarNombreSeccion(sec.id, e.target.value)}
                  className="text-lg font-semibold flex-1 bg-transparent focus:outline-none border-b border-blue-500"
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <h3
                    className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                    onClick={() => setEditingSeccionId(sec.id)}
                  >
                    {sec.nombre}
                  </h3>
                  <select
                    value={sec.compas}
                    onChange={(e) => setSecciones(prev => prev.map(s =>
                      s.id === sec.id ? { ...s, compas: e.target.value } : s
                    ))}
                    className="text-xs font-medium border border-gray-200 rounded-lg py-1 px-2 bg-white"
                  >
                    <option value="3/4">3/4</option>
                    <option value="4/4">4/4</option>
                    <option value="6/8">6/8</option>
                  </select>
                </div>
              )}

              <button
                onClick={() => eliminarSeccion(sec.id)}
                className="text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Eliminar sección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
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
                        className={`p-1.5 rounded-lg mr-2 font-mono text-xs font-bold transition-colors ${linea.repetir ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        title="Repetir línea"
                      >
                        :||
                      </button>

                      <div className="grid grid-cols-4 gap-2 flex-1">
                        {linea.compasses.map((compas, cIdx) => {
                          measureCount++;
                          return (
                            <div key={compas.id} className="border border-gray-200 rounded-xl p-2 bg-gray-50/50 space-y-2">
                              <div className="flex justify-between items-center text-xs text-gray-400">
                                <span className="font-semibold">{toRoman(measureCount)}</span>
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 4].map(num => (
                                    <button
                                      key={num}
                                      onClick={() => cambiarDivisiones(sec.id, lIdx, cIdx, num)}
                                      className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${compas.divisiones === num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${compas.divisiones}, minmax(0, 1fr))` }}>
                                {compas.acordes.map((acorde, dIdx) => (
                                  <button
                                    key={acorde.id}
                                    onClick={() => setModalData({
                                      seccionId: sec.id,
                                      lineaIndex: lIdx,
                                      compasIndex: cIdx,
                                      divisionIndex: dIdx,
                                      valorActual: acorde.valor
                                    })}
                                    className="w-full py-1.5 px-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-center hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors min-h-[32px] flex items-center justify-center"
                                  >
                                    {acorde.valor || <span className="text-gray-300">-</span>}
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
                className="w-full py-2 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
              >
                + Agregar Línea
              </button>
            </div>
          </div>
        ))}

        {/* Input para nueva sección */}
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevaSeccionNombre}
            onChange={(e) => setNuevaSeccionNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregarSeccion()}
            placeholder="Nombre de nueva sección (ej: Coro, Estrofa...)"
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <button
            onClick={agregarSeccion}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Agregar Sección
          </button>
        </div>
      </div>

      {/* Modal / Pop-up Teclado Musical */}
      {modalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800">Seleccionar Acorde</h3>
              <button
                onClick={() => setModalData(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <MusicKeyboard
              currentChord={modalData.valorActual}
              availableChords={getAcordesDisponibles()}
              onSelectChord={(nuevoAcorde) => {
                handleAcordeChange(
                  modalData.seccionId,
                  modalData.lineaIndex,
                  modalData.compasIndex,
                  modalData.divisionIndex,
                  nuevoAcorde
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}