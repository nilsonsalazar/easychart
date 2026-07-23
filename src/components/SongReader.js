import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useLocation, Link } from 'react-router-dom';
import circulos from "./circulos";
import { API_URL } from './config';
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import toRoman from "./toRoman";

const SongReader = () => {
  const location = useLocation();
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [compass, setCompass] = useState("4/4");
  const [compas, setCompas] = useState("4/4");
  const [semitono, setSemitono] = useState(0);
  const [savedSongs, setSavedSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);

  // Posiciones para portales flotantes
  const [toneMenuCoords, setToneMenuCoords] = useState({ top: 0, left: 0, width: 0 });
  const [searchCoords, setSearchCoords] = useState({ top: 0, left: 0, width: 0 });

  const searchInputRef = useRef(null);
  const toneBtnRef = useRef(null);
  const toneMenuRef = useRef(null);
  const searchDropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    window.location.href = '/';
  };

  const tonos = [
    "C", "D♭", "D", "E♭", "E", "F",
    "G♭", "G", "A♭", "A", "B♭", "B"
  ];
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");

  // Calcular posiciones absolutas en pantalla al abrir desplegables o hacer scroll
  const updateToneCoords = () => {
    if (toneBtnRef.current) {
      const rect = toneBtnRef.current.getBoundingClientRect();
      setToneMenuCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 288) // 288px = w-72
      });
    }
  };

  const updateSearchCoords = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setSearchCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const toggleToneMenu = () => {
    if (!showToneMenu) {
      updateToneCoords();
    }
    setShowToneMenu(!showToneMenu);
  };

  // Escuchar clics fuera de los menús
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toneBtnRef.current && !toneBtnRef.current.contains(event.target) &&
        toneMenuRef.current && !toneMenuRef.current.contains(event.target)
      ) {
        setShowToneMenu(false);
      }

      if (
        searchInputRef.current && !searchInputRef.current.contains(event.target) &&
        searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)
      ) {
        setShowSongDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateToneCoords);
    window.addEventListener("scroll", updateToneCoords, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateToneCoords);
      window.removeEventListener("scroll", updateToneCoords, true);
    };
  }, []);

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
            updateSearchCoords();
          }
        }
      } catch (error) {
        console.error('Error al cargar canciones:', error);
      }
    };

    fetchSongs();
  }, [searchTerm]);

  const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

  const handleSearch = async (term) => {
    setSearchTerm(term);
    updateSearchCoords();

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
        const artist = normalize(song.artist || song.song_data?.artist || "");
        const target = `${title} ${artist}`;
        return words.every(word => target.includes(word));
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

  return (
    <div className="min-h-screen bg-[#0A0A0B]/90 text-stone-200 p-4 pb-20">
      {/* HEADER TIPO RACK */}
      <header className="sticky top-0 z-10 bg-[#121214]/80 backdrop-blur-md shadow-2xl py-4 px-6 rounded-2xl mb-6 border border-stone-800/80">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 p-2.5 rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-amber-500 tracking-tight" style={{ fontFamily: 'Caveat, sans-serif' }}>
                EasyChart
              </h1>
              <p className="text-xs text-stone-400 font-medium">Consulta y Lector de Charts Musicales</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/crear"
              className="flex items-center px-4 py-2.5 bg-amber-600 text-stone-950 font-semibold text-sm rounded-xl hover:bg-amber-500 transition-all shadow-md hover:shadow-amber-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear o Editar Canción
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center px-3.5 py-2.5 bg-stone-900/80 text-stone-400 hover:bg-red-950/40 hover:text-red-400 font-medium text-sm rounded-xl transition-all border border-stone-800 cursor-pointer"
              title="Cerrar Sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* CONTENEDOR BUSCADOR Y CONTROLES */}
        <div className="bg-[#121214]/70 backdrop-blur-md rounded-2xl shadow-xl border border-stone-800/80 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-500/90 mb-2">
              ingresa artista o canción
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  updateSearchCoords();
                  if (filteredSongs.length > 0) setShowSongDropdown(true);
                }}
                placeholder="ingresa artista o canción..."
                className="w-full pl-10 pr-4 py-3 bg-stone-950/80 border border-stone-800 rounded-xl focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all text-stone-100 placeholder-stone-500 font-medium"
              />
            </div>
          </div>

          {/* CONTROLES DE TONALIDAD / EXPORTACIÓN */}
          {selectedSongId && (
            <div className="pt-4 border-t border-stone-800/80 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Tonalidad Directa
                  </label>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                  </span>
                </div>

                <div>
                  <button
                    ref={toneBtnRef}
                    type="button"
                    onClick={toggleToneMenu}
                    className="flex items-center justify-between w-full sm:w-64 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold shadow-lg hover:shadow-amber-500/20 transition cursor-pointer"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => ajustarSemitono(-1)}
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/80 text-stone-200 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Bajar medio tono (-1 semitono)"
                >
                  <span className="w-6 h-6 rounded-lg bg-stone-800 group-hover:bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-black transition-colors">
                    ♭
                  </span>
                  <span>Bajar Tono (-1 st)</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/80 text-stone-200 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Subir medio tono (+1 semitono)"
                >
                  <span>Subir Tono (+1 st)</span>
                  <span className="w-6 h-6 rounded-lg bg-stone-800 group-hover:bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-black transition-colors">
                    ♯
                  </span>
                </button>

                <div className="w-full md:w-auto flex-1">
                  <PDFDownloadLink
                    document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                    fileName={`${(tituloCancion || 'chart').replace(/\s+/g, '_')}_${tono}.pdf`}
                    className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {({ loading, error }) => (
                      loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Exportar a PDF</span>
                        </>
                      )
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* VISUALIZADOR DEL CHART DE ACORDES */}
        {selectedSongId ? (
          <div className="bg-[#121214]/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-stone-800/80" style={{
            fontFamily: 'Architects Daughter, cursive',
          }}>
            <div className="text-center mb-8 border-b border-stone-800 pb-6">
              <h2 className="text-3xl font-bold mb-2 text-[#FEF3C7] tracking-wide">{tituloCancion} - {artista || "Autor"}</h2>
              <p className="text-lg text-amber-500/90 font-mono">
                Tonalidad: {tono} • Compás: {compas} • Tempo: {tempo} BPM
              </p>
            </div>

            {secciones.map((sec, secIdx) => (
              <div key={secIdx} className="mb-10">
                <h3 className="text-xl font-bold border-b border-amber-500/30 text-amber-400 pb-1 mb-6 uppercase tracking-wider">
                  {sec.nombre} • {sec.compas}
                </h3>

                {sec.lineas.map((linea, lIdx) => {
                  let measureCount = 0;
                  for (let i = 0; i < lIdx; i++) {
                    measureCount += sec.lineas[i].compasses.length;
                  }

                  return (
                    <div key={lIdx} className="mb-8 flex items-center">
                      {linea.repetir && <span className="text-2xl mx-2 text-amber-500">%</span>}

                      <div className="flex justify-evenly gap-0 flex-1">
                        {linea.compasses.map((compass, cIdx) => {
                          measureCount++;
                          const divisiones = compass.acordes.length;

                          return (
                            <div key={cIdx} className="relative w-1/4 border-l border-r border-stone-600/80 px-2 py-1 bg-stone-950/40 my-1 rounded-sm">
                              <div className="absolute -top-5 left-0 right-0 text-center">
                                <span className="text-xs text-stone-400 font-sans">{toRoman(measureCount)}</span>
                              </div>

                              <div
                                className={`grid gap-2`}
                                style={{
                                  gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`,
                                  textAlign: 'center',
                                }}
                              >
                                {compass.acordes.map((acorde, dIdx) => (
                                  <div key={dIdx} className="py-1 text-2xl font-extrabold text-[#FEF3C7] drop-shadow-sm">
                                    {acorde.valor || "-"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {linea.repetir && <span className="text-2xl mx-2 text-amber-500">:||</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121214]/60 backdrop-blur-md rounded-2xl p-12 text-center border-2 border-dashed border-stone-800/80 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-amber-500/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-stone-400 font-medium">Selecciona o busca una canción arriba para visualizar el chart</p>
          </div>
        )}
      </div>

      {/* PORTAL CERO-SUPERPOSICIÓN: DESPLEGABLE BUSCADOR */}
      {showSongDropdown && filteredSongs.length > 0 && ReactDOM.createPortal(
        <div
          ref={searchDropdownRef}
          style={{
            position: 'absolute',
            top: `${searchCoords.top}px`,
            left: `${searchCoords.left}px`,
            width: `${searchCoords.width}px`,
            zIndex: 99999
          }}
          className="bg-[#18181B] border border-stone-700/80 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-stone-800"
        >
          {filteredSongs.map(song => (
            <div
              key={song.id}
              className={`p-3.5 hover:bg-amber-500/10 transition-colors cursor-pointer flex justify-between items-center ${selectedSongId === song.id ? 'bg-amber-500/20' : ''}`}
              onClick={() => {
                loadSong(song.id);
                setSearchTerm(song.title);
                setSelectedSongId(song.id);
                setShowSongDropdown(false);
              }}
            >
              <div>
                <div className="font-semibold text-stone-100">{song.title}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {song.artist || song.song_data?.artist ? `Artista: ${song.artist || song.song_data?.artist} • ` : ''}Tonalidad: {song.key_signature}
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-900 text-amber-500 border border-stone-800 rounded-lg">
                {song.tempo} BPM
              </span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* PORTAL CERO-SUPERPOSICIÓN: DESPLEGABLE TONALIDAD */}
      {showToneMenu && ReactDOM.createPortal(
        <div
          ref={toneMenuRef}
          style={{
            position: 'absolute',
            top: `${toneMenuCoords.top}px`,
            left: `${toneMenuCoords.left}px`,
            width: `${toneMenuCoords.width}px`,
            zIndex: 99999
          }}
          className="rounded-2xl border border-stone-700 bg-[#18181B] shadow-2xl p-3"
        >
          <p className="text-xs text-stone-400 mb-3">Selecciona una tonalidad</p>
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
                  className={`py-2 rounded-xl font-bold transition cursor-pointer ${activo ? "bg-amber-500 text-stone-950" : "bg-stone-900 text-stone-300 hover:bg-amber-500/20 hover:text-amber-400"
                    }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SongReader;