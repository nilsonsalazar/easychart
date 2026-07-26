import React, { useState, useEffect, useRef } from "react";
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

  // ESTADO PARA PANEL MÓVIL (DESPLIEGUE INFERIOR)
  const [isMobileSetlistOpen, setIsMobileSetlistOpen] = useState(false);

  // Estado e índices para Drag & Drop (Desktop + Móvil)
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [touchTargetIndex, setTouchTargetIndex] = useState(null);
  const listContainerRef = useRef(null);

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
          const savedOrder = localStorage.getItem("easychart_setlist_order");
          if (savedOrder) {
            try {
              const orderIds = JSON.parse(savedOrder);
              const songMap = new Map(songList.map(song => [String(song.id), song]));

              const orderedSongs = [];
              orderIds.forEach(id => {
                if (songMap.has(String(id))) {
                  orderedSongs.push(songMap.get(String(id)));
                  songMap.delete(String(id));
                }
              });

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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const reorderList = (fromIndex, toIndex) => {
    if (fromIndex === null || fromIndex === toIndex || toIndex === null) return;
    const updatedList = [...savedSongs];
    const [draggedItem] = updatedList.splice(fromIndex, 1);
    updatedList.splice(toIndex, 0, draggedItem);

    setSavedSongs(updatedList);
    const orderIds = updatedList.map(song => song.id);
    localStorage.setItem("easychart_setlist_order", JSON.stringify(orderIds));
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    reorderList(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const handleTouchStart = (index) => {
    setDraggedIndex(index);
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const itemContainer = targetElement?.closest('[data-song-index]');

    if (itemContainer) {
      const targetIndex = parseInt(itemContainer.getAttribute('data-song-index'), 10);
      if (!isNaN(targetIndex)) {
        setTouchTargetIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && touchTargetIndex !== null) {
      reorderList(draggedIndex, touchTargetIndex);
    }
    setDraggedIndex(null);
    setTouchTargetIndex(null);
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

    // Al seleccionar una canción en móvil, colapsamos el panel inferior automáticamente
    setIsMobileSetlistOpen(false);

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
    <div className="app-container p-2 sm:p-4 pb-24 md:pb-20">
      {/* HEADER LIMPIO DE ESCRITORIO / MÓVIL */}
      <header className="sticky top-0 z-20 app-card py-2.5 px-3 sm:px-6 mb-4 sm:mb-6 backdrop-blur-md bg-opacity-95 border-b-2 border-[#1A1918]/10 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-[#2C2A29] text-[#FAF9F5] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-xs sm:text-sm font-mono font-bold tracking-wider uppercase">
                SETLIST READER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-lg transition-all border border-[#D3CEBE] uppercase tracking-wider"
            >
              Regresar
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-lg transition-all border border-[#D3CEBE] cursor-pointer uppercase tracking-wider"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">

        {/* OVERLAY DE FONDO PARA MÓVIL CUANDO SE ABRE EL PANEL INFERIOR */}
        {isMobileSetlistOpen && (
          <div
            onClick={() => setIsMobileSetlistOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        {/* COLUMNA SETLIST: Panel deslizable DESDE ABAJO en móvil, lateral en Desktop */}
        <div className={`
          fixed inset-x-0 bottom-0 z-40 md:relative md:bottom-auto md:z-0
          bg-[#FAF9F5] rounded-t-2xl md:rounded-xl shadow-[0_-10px_25px_rgba(0,0,0,0.2)] md:shadow-lg 
          border-t-2 md:border-2 border-[#2C2A29] p-3 sm:p-4 
          h-[75vh] md:h-[calc(100vh-100px)] md:sticky md:top-20 flex flex-col 
          transition-transform duration-300 ease-in-out
          ${isMobileSetlistOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
          {/* Asa/Header del panel inferior */}
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#D3CEBE]">
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 bg-[#8C867E] rounded-full md:hidden inline-block mr-1" />
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#2C2A29] font-bold">
                Setlist ({savedSongs.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#8C867E]">Mueve para reordenar</span>
              <button
                type="button"
                onClick={() => setIsMobileSetlistOpen(false)}
                className="md:hidden text-xs font-bold font-mono px-2 py-0.5 bg-[#EBE9E1] border border-[#D3CEBE] rounded"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto space-y-2 pr-1 touch-pan-y"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {savedSongs.map((song, index) => {
              const isSelected = selectedSongId === song.id;
              const isBeingDragged = draggedIndex === index;
              const isTouchTarget = touchTargetIndex === index;

              return (
                <div
                  key={song.id}
                  data-song-index={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => loadSong(song.id)}
                  className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 select-none ${isSelected
                      ? "bg-[#2C2A29] text-[#FAF9F5] border-[#1A1918] shadow-md"
                      : "bg-[#EBE9E1] hover:bg-[#D3CEBE] text-[#2C2A29] border-[#D3CEBE]"
                    } ${isBeingDragged ? "opacity-40 scale-95" : ""} ${isTouchTarget ? "border-amber-500 border-dashed" : ""
                    }`}
                >
                  <span
                    onTouchStart={() => handleTouchStart(index)}
                    className="text-[#8C867E] font-mono text-sm px-2 py-1 cursor-grab touch-none"
                  >
                    ⋮⋮
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm leading-snug truncate">
                      {index + 1}. {song.title}
                    </div>
                    <div className="flex justify-between items-center mt-0.5 text-[11px] font-mono opacity-80">
                      <span className="truncate pr-2">{song.artist || "Sin Artista"}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono ${isSelected ? 'bg-[#D8B45A] text-[#2C2A29]' : 'bg-[#D3CEBE] text-[#2C2A29]'
                    }`}>
                    {song.key_signature || "C"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA READER DE LA CANCIÓN */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {selectedSongId ? (
            <>
              {/* CONTROLES DE EJECUCIÓN */}
              <div className="bg-[#FAF9F5] rounded-xl shadow-lg border-2 border-[#2C2A29] p-4 sm:p-6 space-y-4">
                <div className="text-center border-b border-[#D3CEBE] pb-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2C2A29]" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                    {tituloCancion}
                  </h1>
                  {artista && (
                    <p className="text-base sm:text-lg font-semibold text-[#5C5853] mt-0.5" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                      {artista}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 pt-1">
                  {/* Selector Tonalidad */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowToneMenu(!showToneMenu)}
                      className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#2C2A29] text-[#FAF9F5] font-mono text-xs tracking-wider uppercase font-semibold shadow hover:bg-[#1A1918] transition"
                    >
                      <span>🎵 Tono: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}</span>
                    </button>

                    {showToneMenu && (
                      <div className="absolute z-50 mt-2 w-64 sm:w-72 rounded-xl border-2 border-[#2C2A29] bg-[#FAF9F5] shadow-2xl p-2.5">
                        <div className="grid grid-cols-4 gap-1">
                          {tonos.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                cambiarTonalidad(t);
                                setShowToneMenu(false);
                              }}
                              className={`py-1.5 rounded font-bold text-xs font-mono transition ${tono === t ? "bg-[#2C2A29] text-[#D8B45A]" : "bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE]"
                                }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transposición rápida */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(-1)}
                      className="px-2.5 py-1.5 bg-[#EBE9E1] border border-[#D3CEBE] hover:bg-[#D3CEBE] text-[#2C2A29] rounded-lg font-bold text-xs font-mono active:scale-95 transition"
                    >
                      ♭ -1
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(1)}
                      className="px-2.5 py-1.5 bg-[#EBE9E1] border border-[#D3CEBE] hover:bg-[#D3CEBE] text-[#2C2A29] rounded-lg font-bold text-xs font-mono active:scale-95 transition"
                    >
                      ♯ +1
                    </button>
                  </div>

                  {/* BPM */}
                  <div className="text-xs font-mono font-bold text-[#2C2A29] bg-[#EBE9E1] px-3 py-1.5 rounded-lg border border-[#D3CEBE]">
                    ⏱️ {tempo} BPM
                  </div>

                  {/* PDF */}
                  <button
                    onClick={() => setShowPDFOptions(!showPDFOptions)}
                    className="px-3 py-1.5 bg-[#EBE9E1] border border-[#D3CEBE] text-[#2C2A29] hover:bg-[#D3CEBE] font-mono text-xs uppercase font-medium rounded-lg transition shadow cursor-pointer"
                  >
                    PDF
                  </button>
                </div>

                {showPDFOptions && (
                  <div className="mt-2 p-2.5 border border-[#D3CEBE] rounded-lg bg-[#EBE9E1]/50">
                    <PDFDownloadLink
                      document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                      fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                      className="block w-full text-center px-3 py-2 bg-[#2C2A29] text-[#FAF9F5] hover:bg-[#1A1918] font-mono text-xs tracking-wider uppercase font-medium rounded-lg transition shadow cursor-pointer"
                    >
                      {({ loading, error }) => (
                        loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                      )}
                    </PDFDownloadLink>
                  </div>
                )}
              </div>

              {/* SECCIONES REAL BOOK */}
              {secciones.map((sec) => (
                <div key={sec.id} className="bg-[#FAF9F5] rounded-xl shadow-lg border-2 border-[#2C2A29] overflow-hidden text-[#2C2A29]">
                  <div className="p-2.5 border-b-2 border-[#2C2A29] bg-[#EBE9E1] flex justify-between items-center">
                    <h3 className="font-bold text-[#2C2A29] text-xs sm:text-sm uppercase tracking-wider font-sans">
                      {sec.nombre}
                    </h3>
                    <span className="text-[10px] font-mono text-[#5C5853] uppercase">{sec.compas || "4/4"}</span>
                  </div>

                  <div className="p-3 sm:p-5 space-y-4" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                    {sec.lineas.map((linea) => (
                      <div key={linea.id} className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-sans select-none ${linea.repetir ? 'bg-[#2C2A29] text-[#D8B45A] font-bold' : 'text-[#8C867E]'
                          }`}>
                          {linea.repetir ? ':||' : '||'}
                        </span>

                        <div className="flex justify-evenly gap-1.5 sm:gap-2 flex-1">
                          {linea.compasses.map((compass, cIdx) => (
                            <div key={compass.id} className="relative w-1/4 border-l-2 border-r-2 border-[#2C2A29] px-1 sm:px-2 py-2 sm:py-3 bg-white rounded-sm shadow-sm">
                              <div className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] text-[#8C867E] font-mono select-none">
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
                                    className="text-base sm:text-xl font-extrabold text-[#1A1918] select-none"
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
            <div className="bg-[#FAF9F5] rounded-xl shadow-lg border-2 border-[#2C2A29] p-8 text-center text-[#5C5853] font-mono">
              <p className="text-sm sm:text-base font-bold">Pulsa "📋 Abrir Setlist" abajo para elegir una canción.</p>
            </div>
          )}
        </div>

      </div>

      {/* BOTÓN FLOTANTE INFERIOR (SÓLO MÓVIL) */}
      <div className="fixed bottom-3 inset-x-0 z-30 flex justify-center md:hidden px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => setIsMobileSetlistOpen(!isMobileSetlistOpen)}
          className="pointer-events-auto px-5 py-2.5 bg-[#2C2A29] text-[#D8B45A] font-mono font-bold text-xs rounded-full border-2 border-[#D8B45A] shadow-2xl flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span>📋</span>
          <span>{isMobileSetlistOpen ? 'Ocultar Setlist' : `Abrir Setlist (${savedSongs.length})`}</span>
        </button>
      </div>

    </div>
  );
}