import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import circulos, { relativasMenores } from "./circulos";
import { API_URL, SONGS_API_URL } from './config';

import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import toRoman from "./toRoman";

export default function SetList() {
  const { id } = useParams();

  // ESTADOS DE SETLISTS Y TABS
  const [setlists, setSetslists] = useState([]);
  const [activeSetlistId, setActiveSetlistId] = useState(null);

  // ESTADOS MÚSICA Y CANCIÓN ACTUAL
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [savedSongs, setSavedSongs] = useState([]);
  const [showToneMenu, setShowToneMenu] = useState(false);

  // Identificador del registro específico en la lista (interacción con la UI)
  const [selectedSetlistSongId, setSelectedSetlistSongId] = useState(null);

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

  // Función para limpiar/desseleccionar la canción visualizada
  const resetActiveSong = () => {
    setSelectedSetlistSongId(null);
    setSecciones([]);
    setTituloCancion("");
    setArtista("");
    setTono("C");
    setTempo("120");
    setSemitono(0);
  };

  // CARGAR SETLISTS Y CANCIONES DESDE LA API
  useEffect(() => {
    const fetchSongsAndSetlists = async () => {
      const token = localStorage.getItem('easychart_token');
      try {
        const response = await fetch(SONGS_API_URL, {
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

        let loadedSetlists = [];

        if (data.setlists && Array.isArray(data.setlists)) {
          loadedSetlists = data.setlists;
        } else if (Array.isArray(data) && data.length > 0 && data[0].songs) {
          loadedSetlists = data;
        } else if (Array.isArray(data)) {
          loadedSetlists = [{ id: 'default', setlist_name: 'General', songs: data }];
        } else if (data.data && Array.isArray(data.data)) {
          loadedSetlists = [{ id: 'default', setlist_name: 'General', songs: data.data }];
        } else {
          loadedSetlists = [{ id: 'default', setlist_name: 'General', songs: [] }];
        }

        setSetslists(loadedSetlists);

        if (loadedSetlists.length > 0) {
          const firstSet = loadedSetlists[0];
          const firstSetId = String(firstSet.id);
          setActiveSetlistId(firstSetId);

          // 📦 Cargar orden personalizado si existe
          let initialSongs = firstSet.songs || [];
          const savedOrder = localStorage.getItem(`easychart_order_${firstSetId}`);
          if (savedOrder) {
            try {
              initialSongs = JSON.parse(savedOrder);
            } catch (e) {
              console.error("Error al parsear orden inicial en cache", e);
            }
          }

          setSavedSongs(initialSongs);

          // 🔍 Verificar posición/canción activa guardada
          const savedLastSong = localStorage.getItem(`easychart_last_song_${firstSetId}`);
          let loadedFromCache = false;

          if (savedLastSong && initialSongs.length > 0) {
            try {
              const { songId, itemKey } = JSON.parse(savedLastSong);
              loadSong(songId, itemKey);
              loadedFromCache = true;
            } catch (e) {
              console.error("Error al parsear canción en cache", e);
            }
          }

          if (!loadedFromCache) {
            resetActiveSong();
          }
        }
      } catch (error) {
        console.error('Error de conexión:', error);
      }
    };

    fetchSongsAndSetlists();
  }, []);

  // CAMBIO DE TAB / SETLIST
  const handleTabChange = (setlistId) => {
    const targetIdStr = String(setlistId);
    setActiveSetlistId(targetIdStr);
    resetActiveSong();

    const targetSetlist = setlists.find(s => String(s.id) === targetIdStr);
    let songs = targetSetlist?.songs || [];

    // 📦 Intentar cargar orden personalizado si existe
    const savedOrder = localStorage.getItem(`easychart_order_${targetIdStr}`);
    if (savedOrder) {
      try {
        songs = JSON.parse(savedOrder);
      } catch (e) {
        console.error("Error al cargar orden guardado", e);
      }
    }

    setSavedSongs(songs);

    // 🔍 Restaurar la última canción seleccionada en esta pestaña
    const savedLastSong = localStorage.getItem(`easychart_last_song_${targetIdStr}`);
    if (savedLastSong && songs.length > 0) {
      try {
        const { songId, itemKey } = JSON.parse(savedLastSong);
        const exists = songs.some(s => {
          const key = s.id_set_list_song || s.id_song_setlist;
          return String(s.id) === String(songId) || (key && String(key) === String(itemKey));
        });

        if (exists) {
          loadSong(songId, itemKey);
        }
      } catch (e) {
        console.error("Error al restaurar última canción guardada", e);
      }
    }
  };

  useEffect(() => {
    if (id && savedSongs.length > 0) {
      const foundItem = savedSongs.find(s => String(s.id) === String(id));
      if (foundItem) {
        const uniqueKey = foundItem.id_set_list_song || foundItem.id_song_setlist || `${foundItem.id}-0`;
        loadSong(foundItem.id, uniqueKey);
      } else {
        loadSong(id, id);
      }
    }
  }, [id]);

  // FUNCIONES DE DRAG & DROP
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

    // 1. Estado local de la lista
    setSavedSongs(updatedList);

    // 2. Persistir el nuevo orden en localStorage
    if (activeSetlistId) {
      localStorage.setItem(`easychart_order_${activeSetlistId}`, JSON.stringify(updatedList));

      // 3. Actualizar la lista dentro del estado principal de setlists
      setSetslists(prev =>
        prev.map(s => String(s.id) === String(activeSetlistId) ? { ...s, songs: updatedList } : s)
      );
    }
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

  const loadSong = async (songId, itemKey) => {
    if (!songId) return;

    setIsMobileSetlistOpen(false);
    setSelectedSetlistSongId(itemKey);

    // 💾 Guardar la posición/canción activa de este setlist en localStorage
    if (activeSetlistId) {
      localStorage.setItem(`easychart_last_song_${activeSetlistId}`, JSON.stringify({
        songId,
        itemKey
      }));
    }

    const token = localStorage.getItem('easychart_token');
    try {
      const response = await fetch(`${SONGS_API_URL}?id=${songId}&_=${Date.now()}`, {
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
      {/* HEADER */}
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
              to="/setlist/edit"
              className="px-3 py-1.5 bg-[#2C2A29] text-[#D8B45A] hover:bg-[#1A1918] font-mono font-semibold text-xs rounded-lg transition-all border border-[#2C2A29] uppercase tracking-wider"
            >
              Edit Setlist
            </Link>
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

      {/* TABS DE SETLISTS */}
      {setlists.length > 0 && (
        <div className="max-w-6xl mx-auto mb-4 border-b-2 border-[#2C2A29]/20 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {setlists.map((setlist) => {
            const isActive = activeSetlistId === String(setlist.id);
            const setlist_name = setlist.setlist_name || setlist.titulo || `Setlist ${setlist.id}`;

            return (
              <button
                key={setlist.id}
                type="button"
                onClick={() => handleTabChange(setlist.id)}
                className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all whitespace-nowrap border-t-2 border-x-2 flex items-center gap-2 ${isActive
                  ? "bg-[#2C2A29] text-[#D8B45A] border-[#2C2A29] shadow-md -mb-[2px] z-10"
                  : "bg-[#EBE9E1] text-[#5C5853] border-[#D3CEBE] hover:bg-[#D3CEBE] hover:text-[#2C2A29]"
                  }`}
              >
                <span>📋</span>
                <span>{setlist_name}</span>
                {setlist.songs && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-sans ${isActive ? "bg-[#D8B45A] text-[#2C2A29]" : "bg-[#D3CEBE] text-[#2C2A29]"
                    }`}>
                    {setlist.songs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">

        {/* OVERLAY MÓVIL */}
        {isMobileSetlistOpen && (
          <div
            onClick={() => setIsMobileSetlistOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        {/* COLUMNA SETLIST */}
        <div className={`
          fixed inset-x-0 bottom-0 z-40 md:relative md:bottom-auto md:z-0
          bg-[#FAF9F5] rounded-t-2xl md:rounded-xl shadow-[0_-10px_25px_rgba(0,0,0,0.2)] md:shadow-lg 
          border-t-2 md:border-2 border-[#2C2A29] p-3 sm:p-4 
          h-[75vh] md:h-[calc(100vh-100px)] md:sticky md:top-20 flex flex-col 
          transition-transform duration-300 ease-in-out
          ${isMobileSetlistOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#D3CEBE]">
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 bg-[#8C867E] rounded-full md:hidden inline-block mr-1" />
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#2C2A29] font-bold">
                Canciones ({savedSongs.length})
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
              const itemKey = song.id_set_list_song || song.id_song_setlist || `${song.id}-${index}`;
              const isSelected = String(selectedSetlistSongId) === String(itemKey);
              const isBeingDragged = draggedIndex === index;
              const isTouchTarget = touchTargetIndex === index;

              return (
                <div
                  key={itemKey}
                  data-song-index={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => loadSong(song.id, itemKey)}
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

        {/* VISTA READER DE CANCIÓN (ESTRUCTURA REAL BOOK IDÉNTICA A SONGREADER) */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {selectedSetlistSongId ? (
            <div className="app-card p-6 sm:p-8" style={{ fontFamily: 'Architects Daughter, cursive' }}>
              <div className="text-center mb-8 border-b-2 border-[#2C2A29] pb-6 relative">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[#2C2A29] tracking-wide">
                  {tituloCancion} {artista ? `- ${artista}` : ""}
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowToneMenu(!showToneMenu)}
                      className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#2C2A29] text-[#FAF9F5] font-sans font-bold text-xs uppercase tracking-wider shadow hover:bg-[#1A1918] transition cursor-pointer border border-[#1A1918]"
                    >
                      <span>🎵 Tono: <strong>{tono}</strong> {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}</span>
                    </button>

                    {showToneMenu && (
                      <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-64 sm:w-72 rounded-2xl border-2 border-[#2C2A29] bg-[#FAF9F5] shadow-xl p-3">
                        <div className="grid grid-cols-4 gap-1.5 font-sans">
                          {tonos.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                cambiarTonalidad(t);
                                setShowToneMenu(false);
                              }}
                              className={`py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${tono === t ? "bg-[#2C2A29] text-[#FAF9F5] border-[#1A1918]" : "bg-[#EBE9E1] text-[#2C2A29] border-[#D3CEBE] hover:bg-[#F2F0EA]"
                                }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-sans">
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(-1)}
                      className="px-3 py-1.5 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] text-[#2C2A29] rounded-xl font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      ♭ -1 st
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarSemitono(1)}
                      className="px-3 py-1.5 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] text-[#2C2A29] rounded-xl font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      ♯ +1 st
                    </button>
                  </div>

                  <div className="text-xs font-bold text-[#2C2A29] font-mono bg-[#E8E5DC] px-3 py-1.5 rounded-xl border border-[#D3CEBE]">
                    ⏱️ {tempo} BPM
                  </div>

                  <button
                    onClick={() => setShowPDFOptions(!showPDFOptions)}
                    className="px-3 py-1.5 bg-[#E8E5DC] border border-[#D3CEBE] text-[#2C2A29] hover:bg-[#D3CEBE] font-sans text-xs font-bold uppercase rounded-xl transition shadow-sm cursor-pointer"
                  >
                    PDF
                  </button>
                </div>

                {showPDFOptions && (
                  <div className="mt-3 p-3 border border-[#D3CEBE] rounded-xl bg-[#EBE9E1]/60 font-sans max-w-sm mx-auto">
                    <PDFDownloadLink
                      document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                      fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                      className="block w-full text-center px-3 py-2 bg-[#2C2A29] text-[#FAF9F5] hover:bg-[#1A1918] text-xs font-bold tracking-wider uppercase rounded-xl transition shadow cursor-pointer"
                    >
                      {({ loading, error }) => (
                        loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                      )}
                    </PDFDownloadLink>
                  </div>
                )}
              </div>

              {secciones.map((sec, secIdx) => (
                <div key={sec.id || secIdx} className="mb-10">
                  <h3 className="text-xl font-bold border-b-2 border-[#2C2A29] text-[#2C2A29] pb-1 mb-6 uppercase tracking-wider">
                    {sec.nombre} • {sec.compas || "4/4"}
                  </h3>

                  {sec.lineas.map((linea, lIdx) => {
                    let measureCount = 0;
                    for (let i = 0; i < lIdx; i++) {
                      measureCount += sec.lineas[i].compasses.length;
                    }

                    return (
                      <div key={linea.id || lIdx} className="mb-8 flex items-center">
                        {linea.repetir && <span className="text-2xl mx-2 text-[#2C2A29] font-black select-none">%</span>}

                        <div className="flex justify-evenly gap-1 flex-1">
                          {linea.compasses.map((compass, cIdx) => {
                            measureCount++;
                            const divisiones = compass.acordes.length;

                            return (
                              <div key={compass.id || cIdx} className="relative w-1/4 border-2 border-[#2C2A29] p-1 bg-[#FAF9F5] my-1 rounded-md shadow-sm flex flex-col justify-center items-center min-h-[52px]">
                                <div className="absolute -top-3 left-0 right-0 text-center">
                                  <span className="text-xs text-[#5C5853] font-sans bg-[#FAF9F5] px-1 font-semibold">
                                    {toRoman(measureCount)}
                                  </span>
                                </div>

                                <div
                                  className={`grid gap-0.5 w-full divisiones-${divisiones}`}
                                  style={{
                                    gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`,
                                    textAlign: 'center',
                                  }}
                                >
                                  {compass.acordes.map((acorde, dIdx) => (
                                    <div key={acorde.id || dIdx} className="chord-box-global">
                                      {acorde.valor || "-"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {linea.repetir && <span className="text-2xl mx-2 text-[#2C2A29] font-black select-none">%</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="app-card p-12 text-center border-2 border-dashed border-[#D3CEBE] shadow-sm">
              <p className="text-[#5C5853] font-medium font-sans">Selecciona una canción de la lista para ver su chart.</p>
            </div>
          )}
        </div>

      </div>

      {/* BOTÓN FLOTANTE MÓVIL */}
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