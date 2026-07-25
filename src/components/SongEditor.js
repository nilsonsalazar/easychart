import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import circulos, { relativasMenores } from "./circulos";
import { API_URL } from './config';
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import MusicKeyboard from "./MusicKeyboard";

export default function SongEditor() {
  const { id } = useParams(); // Parámetro opcional /edit/:id

  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [savedSongs, setSavedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(id || null);

  const [secciones, setSecciones] = useState([]);
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
  const [editingSeccionId, setEditingSeccionId] = useState(null);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");
  const [showPDFOptions, setShowPDFOptions] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    window.location.href = '/';
  };

  const tonos = [
    "C", "Am", "D♭", "B♭m", "D", "Bm", "E♭", "Cm",
    "E", "C#m", "F", "Dm", "G♭", "E♭m", "G", "Em",
    "A♭", "Fm", "A", "F#m", "B♭", "Gm", "B", "G#m"
  ];

  const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Cargar canción si viene id en la URL o cambia
  useEffect(() => {
    if (id) {
      setSelectedSongId(id);
      loadSong(id);
    }
  }, [id]);

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
    const raizActual = tono.replace("m", "");
    const raizNueva = nuevoTono.replace("m", "");

    const indexActual = notas.indexOf(raizActual) !== -1 ? notas.indexOf(raizActual) : 0;
    const indexNuevo = notas.indexOf(raizNueva) !== -1 ? notas.indexOf(raizNueva) : 0;
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
    const claveCirculo = relativasMenores?.[tono] || tono;
    const tonoActual = circulos[claveCirculo];
    if (!tonoActual) return [];
    return tonoActual.degrees.flatMap(degree => degree.common_extensions);
  };

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
            const term = searchTerm.toLowerCase();
            const filtered = songList.filter(song =>
              (song.title && song.title.toLowerCase().includes(term)) ||
              (song.artist && song.artist.toLowerCase().includes(term))
            );
            setFilteredSongs(filtered);
            setShowSongDropdown(filtered.length > 0);
          }
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

    const normalize = str =>
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    const words = normalize(term).split(/\s+/).filter(Boolean);

    const localResults = savedSongs.filter(song => {
      const title = normalize(song.title || "");
      const artist = normalize(song.artist || song.song_data?.artist || "");
      const target = `${title} ${artist}`;
      return words.every(word => target.includes(word));
    });

    setFilteredSongs(localResults);
    setShowSongDropdown(localResults.length > 0);
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
          compasses: Array.from({ length: 4 }, () => ({
            id: generarId("compass"),
            divisiones: 1,
            acordes: Array(1).fill("").map(() => ({
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
              compasses: Array.from({ length: 4 }, () => ({
                id: generarId("compass"),
                divisiones: 1,
                acordes: Array(1).fill("").map(() => ({
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

  const updateSong = async (songId) => {
    if (!songId) {
      alert("No hay ninguna canción seleccionada para actualizar.");
      return;
    }

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

  const deleteSong = async (songId) => {
    if (!songId) return;

    const confirmFirst = window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar "${tituloCancion || 'esta canción'}"?`);
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(`🔥 ¡ADVERTENCIA! Esta acción no se puede deshacer. ¿Realmente quieres borrar definitivamente la canción?`);
    if (!confirmSecond) return;

    const token = localStorage.getItem('easychart_token');

    try {
      const response = await fetch(`${API_URL}?id=${songId}`, {
        method: 'DELETE',
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al eliminar');
      }

      alert('Canción eliminada correctamente.');

      // Limpiar estados locales tras eliminar
      setSelectedSongId(null);
      setTituloCancion("");
      setArtista("");
      setSecciones([]);
      setSearchTerm("");
      setSavedSongs(prev => prev.filter(s => s.id !== songId));
    } catch (error) {
      console.error('Error deleting song:', error);
      alert(`Error al eliminar la canción: ${error.message || 'Error de conexión'}`);
    }
  };

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

      const rawSongData = typeof song.song_data === 'string'
        ? JSON.parse(song.song_data)
        : song.song_data;

      setTituloCancion(song.title || "");
      setArtista(song.artist || rawSongData?.artist || "");
      setTono(song.key_signature || "C");
      setTempo(song.tempo || "120");
      setSemitono(0);
      setSelectedSongId(songId);

      const loadedSections = (rawSongData?.sections || rawSongData || []).map(section => ({
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
        })) || []
      }));

      setSecciones(loadedSections);
    } catch (error) {
      console.error('Error al cargar la canción:', error);
      alert('Error al cargar la canción');
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
    <div className="app-container p-4 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md bg-opacity-95 border-b-2 border-[#1A1918]/10 shadow-md">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-[#2C2A29]/10">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                  {selectedSongId ? "EASYCHART EDITOR" : "EASYCHART SEARCH & EDIT"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center px-3.5 py-2 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-xl transition-all border border-[#D3CEBE] shadow-sm uppercase tracking-wider"
              >
                Volver
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center px-3.5 py-2 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-xl transition-all border border-[#D3CEBE] shadow-sm cursor-pointer uppercase tracking-wider"
              >
                Salir
              </button>
            </div>
          </div>

          {/* CAMPOS TÍTULO Y ARTISTA (SOLO APARARECEN CUANDO EXISTE UNA CANCIÓN SELECCIONADA / CARGADA) */}
          {selectedSongId && (
            <div className="space-y-1 py-1">
              <input
                type="text"
                value={tituloCancion}
                onChange={(e) => setTituloCancion(e.target.value)}
                className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none text-primary placeholder-[#5C5853]/50 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
                placeholder="Título de la canción"
                style={{ fontFamily: 'Architects Daughter, cursive' }}
              />
              <input
                type="text"
                value={artista}
                onChange={(e) => setArtista(e.target.value)}
                className="text-lg font-semibold w-full text-center bg-transparent focus:outline-none text-[#5C5853] placeholder-[#5C5853]/40 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
                placeholder="Autor o Artista"
                style={{ fontFamily: 'Architects Daughter, cursive' }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* BUSCADOR Y CONFIGURACIÓN */}
        <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500">Búsqueda & Configuración</h2>

          <div className="relative mt-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar canción a editar..."
              className="w-full px-4 py-3 bg-[#E2E8F0]/70 border border-stone-300/80 rounded-xl focus:outline-none focus:border-stone-500 transition-all text-stone-800 placeholder-stone-400 font-sans text-sm"
            />

            {showSongDropdown && filteredSongs.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-[#EAEAEA] border border-stone-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-stone-200">
                {filteredSongs.map(song => (
                  <div
                    key={song.id}
                    className={`p-3.5 hover:bg-stone-200/80 cursor-pointer flex justify-between items-center ${selectedSongId === song.id ? 'bg-stone-200' : ''}`}
                    onClick={() => {
                      loadSong(song.id);
                      setSearchTerm(song.title);
                      setSelectedSongId(song.id);
                      setShowSongDropdown(false);
                    }}
                  >
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">{song.title}</div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {song.artist && (
                          <span className="font-semibold text-stone-800">{song.artist} • </span>
                        )}
                        <span className="font-mono text-stone-500">
                          {song.key_signature} | {song.tempo} BPM
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTROLES DE EDICIÓN Y TONALIDAD (SOLO APARECEN SI HAY UNA CANCIÓN CARGADA) */}
          {selectedSongId && (
            <div className="space-y-4 pt-2 border-t border-stone-300/60">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-500">
                    Tonalidad Directa
                  </label>
                  <span className="text-xs font-mono font-bold text-[#383023] bg-stone-300/60 px-3 py-1 rounded-full border border-stone-300">
                    Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowToneMenu(!showToneMenu)}
                    className="flex items-center justify-between w-full sm:w-64 px-4 py-2.5 rounded-xl bg-[#383023] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase font-semibold shadow hover:bg-[#252017] transition"
                  >
                    <span>🎵 Tono: {tono}</span>
                  </button>

                  {showToneMenu && (
                    <div className="absolute z-50 mt-2 w-full sm:w-72 rounded-xl border border-stone-300 bg-[#EAEAEA] shadow-2xl p-3">
                      <div className="grid grid-cols-4 gap-1.5">
                        {tonos.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              cambiarTonalidad(t);
                              setShowToneMenu(false);
                            }}
                            className={`py-2 rounded-lg font-bold text-xs font-mono transition ${tono === t ? "bg-[#383023] text-[#D8B45A]" : "bg-stone-200 text-stone-800 hover:bg-stone-300"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-stone-500 mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="Tempo"
                    min="0"
                    max="360"
                    step="1"
                    className="w-28 rounded-xl border border-stone-300/80 bg-[#E2E8F0]/70 py-2 px-3 text-sm font-semibold text-stone-800 focus:outline-none focus:border-stone-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => ajustarSemitono(-1)}
                    className="px-4 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                  >
                    ♭ -1 Semitono
                  </button>

                  <button
                    type="button"
                    onClick={() => ajustarSemitono(1)}
                    className="px-4 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                  >
                    ♯ +1 Semitono
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-300/60">
                <button
                  onClick={() => updateSong(selectedSongId)}
                  className="flex items-center px-4 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                >
                  Actualizar Canción
                </button>

                <button
                  onClick={() => {
                    if (!tituloCancion.trim()) {
                      alert("Por favor, ingresa el título de la canción para exportar a PDF.");
                      return;
                    }
                    setShowPDFOptions(!showPDFOptions);
                  }}
                  className="flex items-center px-4 py-2.5 bg-stone-200 border border-stone-300 text-stone-800 hover:bg-stone-300 font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                >
                  {showPDFOptions ? 'Ocultar PDF' : 'Exportar a PDF'}
                </button>
              </div>

              {showPDFOptions && (
                <div className="mt-4 p-4 border border-stone-300/80 rounded-xl bg-stone-200/50">
                  <PDFDownloadLink
                    document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                    fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                    className="block w-full text-center px-4 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                  >
                    {({ loading, error }) => (
                      loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                    )}
                  </PDFDownloadLink>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIONES DE LA CANCIÓN */}
        {selectedSongId && secciones.map((sec) => (
          <div key={sec.id} className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 text-stone-900">
            <div className="flex justify-between items-center p-4 border-b border-stone-300/80 bg-stone-200/50">
              {editingSeccionId === sec.id ? (
                <input
                  type="text"
                  defaultValue={sec.nombre}
                  onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                  autoFocus
                  className="px-3 py-1 bg-white border border-stone-400 rounded text-stone-900 font-bold"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-800 text-base uppercase tracking-wider font-sans">
                    {sec.nombre}
                  </h3>
                  <button
                    onClick={() => setEditingSeccionId(sec.id)}
                    className="text-stone-400 hover:text-stone-700 transition"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <button
                onClick={() => eliminarSeccion(sec.id)}
                className="text-xs font-mono uppercase tracking-wider text-red-700 hover:text-red-900 px-3 py-1 bg-red-100/60 rounded-lg border border-red-200/60 transition"
              >
                Eliminar Sección
              </button>
            </div>

            <div className="p-6 space-y-6" style={{ fontFamily: 'Architects Daughter, cursive' }}>
              {sec.lineas.map((linea, lIdx) => (
                <div key={linea.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRepetirLinea(sec.id, lIdx)}
                    className={`px-2 py-1 rounded text-xs font-sans transition ${linea.repetir ? 'bg-[#383023] text-[#D8B45A]' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}`}
                  >
                    {linea.repetir ? ':||' : '||'}
                  </button>

                  <div className="flex justify-evenly gap-2 flex-1">
                    {linea.compasses.map((compass, cIdx) => (
                      <div key={compass.id} className="relative w-1/4 border-l border-r border-stone-800 px-2 py-2 bg-stone-100/40 rounded-sm">
                        <div className="flex justify-between items-center mb-1 font-sans">
                          <span className="text-[10px] text-stone-500 font-mono">
                            C{cIdx + 1}
                          </span>
                          <select
                            value={compass.divisiones}
                            onChange={(e) => cambiarDivisiones(sec.id, lIdx, cIdx, parseInt(e.target.value))}
                            className="text-[10px] bg-transparent border-none text-stone-600 font-mono focus:outline-none"
                          >
                            <option value={1}>1 div</option>
                            <option value={2}>2 div</option>
                            <option value={4}>4 div</option>
                          </select>
                        </div>

                        <div
                          className="grid gap-1 text-center"
                          style={{
                            gridTemplateColumns: `repeat(${compass.divisiones}, minmax(0, 1fr))`
                          }}
                        >
                          {compass.acordes.map((acorde, dIdx) => (
                            <button
                              key={acorde.id}
                              onClick={() => setModalData({ seccionId: sec.id, lineaIndex: lIdx, compasIndex: cIdx, divisionIndex: dIdx })}
                              className="py-1 text-xl font-extrabold text-stone-900 hover:bg-stone-200 rounded transition border border-dashed border-stone-300 hover:border-stone-500"
                            >
                              {acorde.valor || "-"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={() => agregarLinea(sec.id)}
                className="w-full py-2 bg-stone-200/60 border border-dashed border-stone-400 text-stone-700 hover:bg-stone-200 rounded-xl font-sans text-xs uppercase font-semibold transition"
              >
                + Agregar Línea
              </button>
            </div>
          </div>
        ))}

        {/* AGREGAR NUEVA SECCIÓN */}
        {selectedSongId && (
          <div className="bg-[#EAEAEA]/90 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/40 flex gap-3">
            <input
              type="text"
              value={nuevaSeccionNombre}
              onChange={(e) => setNuevaSeccionNombre(e.target.value)}
              placeholder="Nombre de nueva sección..."
              className="flex-1 px-4 py-2.5 bg-[#E2E8F0]/70 border border-stone-300/80 rounded-xl focus:outline-none focus:border-stone-500 text-stone-800 placeholder-stone-400 font-sans text-sm"
            />
            <button
              onClick={agregarSeccion}
              className="px-5 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-semibold rounded-xl transition shadow"
            >
              + Nueva Sección
            </button>
          </div>
        )}

        {/* BARRADO/ELIMINACIÓN DE CANCIÓN - ABAJO DEL TODO */}
        {selectedSongId && (
          <div className="bg-red-50/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-red-200/80 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-red-900 font-sans uppercase">Zona de Peligro</h4>
              <p className="text-xs text-red-700 mt-0.5">Elimina permanentemente esta canción de la base de datos.</p>
            </div>
            <button
              onClick={() => deleteSong(selectedSongId)}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 font-mono text-xs tracking-wider uppercase font-bold rounded-xl transition shadow cursor-pointer active:scale-95"
            >
              🗑️ Eliminar Canción
            </button>
          </div>
        )}
      </div>

      {/* MODAL SELECCIÓN DE ACORDES */}
      {modalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#EAEAEA] rounded-2xl shadow-2xl border border-white/50 p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-stone-300 pb-2">
              <h4 className="font-bold text-stone-800 text-sm font-sans uppercase">Seleccionar Acorde ({tono})</h4>
              <button
                onClick={() => setModalData(null)}
                className="text-stone-500 hover:text-stone-800 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
              <button
                onClick={() => handleAcordeChange(modalData.seccionId, modalData.lineaIndex, modalData.compasIndex, modalData.divisionIndex, "")}
                className="py-2 bg-stone-300/60 hover:bg-stone-300 text-stone-700 rounded-lg font-bold text-xs font-mono"
              >
                Limpiar (-)
              </button>
              {getAcordesDisponibles().map((acorde, i) => (
                <button
                  key={i}
                  onClick={() => handleAcordeChange(modalData.seccionId, modalData.lineaIndex, modalData.compasIndex, modalData.divisionIndex, acorde)}
                  className="py-2 bg-stone-200 hover:bg-[#383023] hover:text-[#D8B45A] text-stone-800 rounded-lg font-bold text-xs font-mono transition"
                >
                  {acorde}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-300 space-y-2">
              <label className="block text-xs font-mono uppercase tracking-widest text-stone-500">
                Acorde Personalizado
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="customChordInput"
                  className="flex-1 px-3 py-2 bg-stone-100 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-500 text-stone-800 placeholder-stone-400 font-sans text-sm font-semibold"
                  placeholder="Ej: C#m7, G7sus4..."
                  onClick={(e) => {
                    const keyboard = document.getElementById('musicKeyboard');
                    if (keyboard) keyboard.classList.remove('hidden');
                    e.stopPropagation();
                  }}
                />
                <button
                  className="px-4 py-2 bg-[#383023] hover:bg-[#252017] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase font-semibold rounded-xl transition shadow cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById('customChordInput');
                    if (input && input.value.trim()) {
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
                  Usar
                </button>
              </div>

              <div id="musicKeyboard" className="hidden pt-1 w-full">
                <MusicKeyboard
                  onKeyPress={(char) => {
                    const input = document.getElementById('customChordInput');
                    if (input) {
                      input.value = (input.value || '') + char;
                      input.focus();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}