import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import circulos, { relativasMenores } from "./circulos";
import { API_URL } from './config';
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";

export default function SetList() {
  const { id } = useParams();

  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [savedSongs, setSavedSongs] = useState([]);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(id || null);

  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");
  const [showPDFOptions, setShowPDFOptions] = useState(false);

  // Estado para el índice del elemento que se está arrastrando
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  // 1. Cargar lista del API y aplicar inmediatamente el orden local (tras bambalinas)
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
          // Recuperar el orden personalizado que guardó el cliente previamente
          const savedOrder = localStorage.getItem("easychart_setlist_order");
          if (savedOrder) {
            try {
              const orderIds = JSON.parse(savedOrder);
              const songMap = new Map(songList.map(song => [String(song.id), song]));

              const orderedSongs = [];
              // Insertar según el orden personalizado
              orderIds.forEach(id => {
                if (songMap.has(String(id))) {
                  orderedSongs.push(songMap.get(String(id)));
                  songMap.delete(String(id));
                }
              });

              // Si agregaron canciones nuevas desde otro lado, se meten al final sin romper nada
              const finalSongs = [...orderedSongs, ...Array.from(songMap.values())];
              setSavedSongs(finalSongs);
            } catch (e) {
              setSavedSongs(songList);
            }
          } else {
            setSavedSongs(songList);
          }
        }
      } catch (error) {
        console.error('Error de conexión:', error);
      }
    };
    fetchSongs();
  }, []);

  useEffect(() => {
    if (id) {
      setSelectedSongId(id);
      loadSong(id);
    }
  }, [id]);

  // 2. Lógica Drag & Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedList = [...savedSongs];
    const [draggedItem] = updatedList.splice(draggedIndex, 1);
    updatedList.splice(targetIndex, 0, draggedItem);

    // Actualizar estado en UI
    setSavedSongs(updatedList);
    setDraggedIndex(null);

    // Persistir silencio en el cliente para que "mágicamente" siga así cuando vuelva
    const orderIds = updatedList.map(song => song.id);
    localStorage.setItem("easychart_setlist_order", JSON.stringify(orderIds));
  };

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

  const loadSong = async (songId) => {
    if (!songId) return;
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

  return (
    <div className="app-container p-4 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md bg-opacity-95 border-b-2 border-[#1A1918]/10 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                SETLIST READER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center px-3.5 py-2 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-xl transition-all border border-[#D3CEBE] shadow-sm uppercase tracking-wider"
            >
              Regresar
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
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* COLUMNA IZQUIERDA: LISTA REORDENABLE POR DRAG & DROP */}
        <div className="md:col-span-1 bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-4 h-[calc(100vh-140px)] sticky top-24 flex flex-col">
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-stone-300/80">
            <h2 className="text-xs font-mono uppercase tracking-widest text-stone-600 font-bold">
              Setlist ({savedSongs.length})
            </h2>
            <span className="text-[10px] font-mono text-stone-400">Arrastra para ordenar</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {savedSongs.map((song, index) => {
              const isSelected = selectedSongId === song.id;
              return (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => loadSong(song.id)}
                  className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5 ${isSelected
                      ? "bg-[#383023] text-[#EAEAEA] border-[#383023] shadow-md translate-x-1"
                      : "bg-stone-200/60 hover:bg-stone-300/80 text-stone-800 border-stone-300/80"
                    }`}
                >
                  {/* Grip de arrastre */}
                  <span className="text-stone-400 font-mono text-xs select-none cursor-grab">⋮⋮</span>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-snug truncate">
                      {index + 1}. {song.title}
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs font-mono opacity-80">
                      <span className="truncate pr-2">{song.artist || "Sin Artista"}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono ${isSelected ? 'bg-[#D8B45A] text-[#252017]' : 'bg-stone-300 text-stone-700'}`}>
                    {song.key_signature || "C"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA READER DE LA CANCIÓN */}
        <div className="md:col-span-2 space-y-6">
          {selectedSongId ? (
            <>
              {/* ENCABEZADO Y CONTROLES DE EJECUCIÓN */}
              <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-6 space-y-4">
                <div className="text-center border-b border-stone-300/80 pb-4">
                  <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                    {tituloCancion}
                  </h1>
                  {artista && (
                    <p className="text-lg font-semibold text-stone-600 mt-1" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                      {artista}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  {/* Selector Tonalidad */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowToneMenu(!showToneMenu)}
                      className="flex items-center justify-between px-4 py-2 rounded-xl bg-[#383023] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase font-semibold shadow hover:bg-[#252017] transition"
                    >
                      <span>🎵 Tono: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}</span>
                    </button>

                    {showToneMenu && (
                      <div className="absolute z-50 mt-2 w-72 rounded-xl border border-stone-300 bg-[#EAEAEA] shadow-2xl p-3">
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

                  {/* Transposición rápida */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(-1)}
                      className="px-3 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                    >
                      ♭ -1
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(1)}
                      className="px-3 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                    >
                      ♯ +1
                    </button>
                  </div>

                  {/* BPM */}
                  <div className="text-xs font-mono font-bold text-stone-700 bg-stone-200/80 px-3 py-2 rounded-xl border border-stone-300">
                    ⏱️ {tempo} BPM
                  </div>

                  {/* Export PDF */}
                  <button
                    onClick={() => setShowPDFOptions(!showPDFOptions)}
                    className="px-3 py-2 bg-stone-200 border border-stone-300 text-stone-800 hover:bg-stone-300 font-mono text-xs uppercase font-medium rounded-xl transition shadow cursor-pointer"
                  >
                    PDF
                  </button>
                </div>

                {showPDFOptions && (
                  <div className="mt-2 p-3 border border-stone-300/80 rounded-xl bg-stone-200/50">
                    <PDFDownloadLink
                      document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                      fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                      className="block w-full text-center px-4 py-2 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                    >
                      {({ loading, error }) => (
                        loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                      )}
                    </PDFDownloadLink>
                  </div>
                )}
              </div>

              {/* SECCIONES EN SOLO LECTURA */}
              {secciones.map((sec) => (
                <div key={sec.id} className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 text-stone-900">
                  <div className="p-3 border-b border-stone-300/80 bg-stone-200/50 flex justify-between items-center">
                    <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider font-sans">
                      {sec.nombre}
                    </h3>
                    <span className="text-[10px] font-mono text-stone-500 uppercase">{sec.compas || "4/4"}</span>
                  </div>

                  <div className="p-5 space-y-5" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                    {sec.lineas.map((linea) => (
                      <div key={linea.id} className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-sans select-none ${linea.repetir ? 'bg-[#383023] text-[#D8B45A] font-bold' : 'text-stone-400'}`}>
                          {linea.repetir ? ':||' : '||'}
                        </span>

                        <div className="flex justify-evenly gap-2 flex-1">
                          {linea.compasses.map((compass, cIdx) => (
                            <div key={compass.id} className="relative w-1/4 border-l-2 border-r-2 border-stone-800 px-2 py-3 bg-stone-100/60 rounded-sm">
                              <div className="absolute top-1 left-1 text-[9px] text-stone-400 font-mono select-none">
                                C{cIdx + 1}
                              </div>

                              <div
                                className="grid gap-1 text-center items-center h-full pt-2"
                                style={{
                                  gridTemplateColumns: `repeat(${compass.divisiones}, minmax(0, 1fr))`
                                }}
                              >
                                {compass.acordes.map((acorde) => (
                                  <span
                                    key={acorde.id}
                                    className="text-xl font-extrabold text-stone-900 select-none"
                                  >
                                    {acorde.valor || "-"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-12 text-center text-stone-500 font-mono">
              <p className="text-base font-bold">Selecciona una canción del cuadro de la izquierda para ver el chart.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}