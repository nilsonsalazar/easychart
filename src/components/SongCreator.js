import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
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

  // Posiciones para portales flotantes (igual que SongReader)
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

  // Calcular posiciones absolutas en pantalla al abrir desplegables o hacer scroll
  const updateToneCoords = () => {
    if (toneBtnRef.current) {
      const rect = toneBtnRef.current.getBoundingClientRect();
      setToneMenuCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 320)
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

  // Escuchar clics fuera de los menús para cerrarlos con seguridad
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
    <div className="min-h-screen bg-[#0A0A0B]/90 text-stone-200 p-4 pb-20">
      {/* HEADER TIPO RACK (Estilo unificado con SongReader) */}
      <header className="sticky top-0 z-10 bg-[#121214]/80 backdrop-blur-md shadow-2xl py-4 px-6 rounded-2xl mb-6 border border-stone-800/80">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-stone-800/80">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 p-2.5 rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-amber-500 tracking-tight" style={{ fontFamily: 'Caveat, sans-serif' }}>
                EasyChart Creator
              </h1>
              <p className="text-xs text-stone-400 font-medium">Editor y Creador de Charts Musicales</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center px-4 py-2.5 bg-stone-900/80 text-stone-300 font-medium text-sm rounded-xl hover:bg-stone-800 transition-all border border-stone-800"
            >
              ← Volver a Consulta
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

        <div className="space-y-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={tituloCancion}
            onChange={(e) => setTituloCancion(e.target.value)}
            className="text-2xl sm:text-3xl font-black w-full text-center bg-transparent focus:outline-none text-stone-100 placeholder-stone-600 tracking-tight"
            placeholder="Título de la canción"
          />
          <input
            type="text"
            value={artista}
            onChange={(e) => setArtista(e.target.value)}
            className="text-lg sm:text-xl font-semibold w-full text-center bg-transparent focus:outline-none text-stone-400 placeholder-stone-600"
            placeholder="Autor o Artista"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* CONTENEDOR BUSCADOR Y CONFIGURACIÓN */}
        <div className="bg-[#121214]/70 backdrop-blur-md rounded-2xl shadow-xl border border-stone-800/80 p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-500/90 mb-2">
              Buscar título o artista
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
                placeholder="Buscar título o artista..."
                className="w-full pl-10 pr-4 py-3 bg-stone-950/80 border border-stone-800 rounded-xl focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all text-stone-100 placeholder-stone-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-800/80">
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

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
              <div className="w-full md:w-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Tempo (BPM)</label>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Tempo"
                  min="0"
                  max="360"
                  step="1"
                  className="w-full md:w-32 rounded-xl border border-stone-800 bg-stone-950/80 py-2.5 px-3 text-sm font-bold text-stone-100 focus:outline-none focus:border-amber-500/80"
                />
              </div>

              <div className="w-full md:w-auto flex-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => ajustarSemitono(-1)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/80 text-stone-200 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                >
                  <span className="w-5 h-5 rounded bg-stone-800 group-hover:bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">♭</span>
                  <span>-1 st</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/80 text-stone-200 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                >
                  <span>+1 st</span>
                  <span className="w-5 h-5 rounded bg-stone-800 group-hover:bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">♯</span>
                </button>
              </div>
            </div>

            {/* Acciones de Guardado y Exportación */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-800/80">
              <button
                onClick={() => selectedSongId ? updateSong(selectedSongId) : saveSong()}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
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
                className="flex items-center px-5 py-2.5 bg-stone-900 border border-stone-800 text-stone-200 hover:bg-stone-800 font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {showPDFOptions ? 'Ocultar PDF' : 'Exportar a PDF'}
              </button>
            </div>

            {showPDFOptions && (
              <div className="mt-3 p-4 border border-stone-800 rounded-xl bg-stone-950/60">
                <PDFDownloadLink
                  document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                  fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                  className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {({ loading, error }) => (
                    loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        </div>

        {/* AGREGAR NUEVA SECCIÓN */}
        <div className="bg-[#121214]/70 backdrop-blur-md rounded-2xl shadow-xl border border-stone-800/80 p-6 flex flex-col md:flex-row items-center gap-3">
          <input
            type="text"
            value={nuevaSeccionNombre}
            onChange={(e) => setNuevaSeccionNombre(e.target.value)}
            placeholder="Nombre de nueva sección (ej. Coro, Intro...)"
            className="flex-1 w-full px-4 py-3 bg-stone-950/80 border border-stone-800 rounded-xl focus:outline-none focus:border-amber-500/80 text-stone-100 font-medium"
          />
          <button
            type="button"
            onClick={agregarSeccion}
            className="w-full md:w-auto px-5 py-3 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800 text-amber-500 font-bold text-sm rounded-xl transition cursor-pointer"
          >
            + Agregar Sección
          </button>
        </div>

        {/* SONG SECTIONS CON ESTILO RACK */}
        {secciones.map((sec, secIdx) => (
          <div key={sec.id} className="bg-[#121214]/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-stone-800/80 text-stone-200">
            {/* Header de sección */}
            <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-stone-900/50">
              {editingSeccionId === sec.id ? (
                <input
                  type="text"
                  defaultValue={sec.nombre}
                  onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                  autoFocus
                  className="px-3 py-1.5 bg-stone-950 border border-amber-500/60 rounded-xl text-stone-100 font-bold text-base focus:outline-none"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-400 text-lg uppercase tracking-wider">
                    {sec.nombre}
                  </h3>
                  <button
                    onClick={() => setEditingSeccionId(sec.id)}
                    className="text-stone-500 hover:text-amber-400 transition text-sm cursor-pointer"
                    title="Editar nombre"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <button
                onClick={() => eliminarSeccion(sec.id)}
                className="text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 px-3.5 py-1.5 bg-red-950/40 rounded-xl border border-red-900/50 transition cursor-pointer"
              >
                Eliminar Sección
              </button>
            </div>

            {/* Contenido de líneas de la sección */}
            <div className="p-6 space-y-6" style={{ fontFamily: 'Architects Daughter, cursive' }}>
              {sec.lineas.map((linea, lIdx) => (
                <div key={linea.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleRepetirLinea(sec.id, lIdx)}
                    className={`px-3 py-1 rounded-lg border font-mono text-sm font-bold transition cursor-pointer ${linea.repetir ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300"
                      }`}
                    title="Alternar barra de repetición (% / :||)"
                  >
                    {linea.repetir ? "% :||" : "Repetir"}
                  </button>

                  <div className="flex justify-evenly gap-0 flex-1">
                    {linea.compasses.map((compass, cIdx) => {
                      const divisiones = compass.acordes.length;

                      return (
                        <div key={compass.id} className="relative w-1/4 border-l border-r border-stone-700/60 px-2 py-1 bg-stone-950/50 my-1 rounded-sm">
                          <div className="absolute -top-5 left-0 right-0 flex justify-between px-1">
                            <span className="text-[10px] text-stone-500 font-sans">{toRoman(cIdx + 1)}</span>
                            <div className="flex gap-1">
                              {[1, 2, 4].map(divOpt => (
                                <button
                                  key={divOpt}
                                  type="button"
                                  onClick={() => cambiarDivisiones(sec.id, lIdx, cIdx, divOpt)}
                                  className={`text-[10px] px-1 rounded font-sans cursor-pointer ${divisiones === divOpt ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-900 text-stone-400 hover:text-stone-200'}`}
                                >
                                  {divOpt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div
                            className="grid gap-1 mt-1"
                            style={{
                              gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`,
                              textAlign: 'center',
                            }}
                          >
                            {compass.acordes.map((acorde, dIdx) => (
                              <input
                                key={acorde.id}
                                type="text"
                                value={acorde.valor}
                                onChange={(e) => handleAcordeChange(sec.id, lIdx, cIdx, dIdx, e.target.value)}
                                placeholder="-"
                                className="w-full bg-stone-900/90 border border-stone-800 rounded text-center text-xl font-bold text-[#FEF3C7] focus:outline-none focus:border-amber-500/80 py-1"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => agregarLinea(sec.id)}
                  className="px-4 py-2 bg-stone-900 border border-stone-800 hover:border-amber-500/50 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  + Agregar Línea
                </button>
              </div>
            </div>
          </div>
        ))}
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
              className={`p-3.5 hover:bg-amber-500/15 transition-colors cursor-pointer flex justify-between items-center ${selectedSongId === song.id ? 'bg-amber-500/25' : ''}`}
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
                  {song.artist ? `Artista: ${song.artist} • ` : ''}Tonalidad: {song.key_signature}
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
          <p className="text-xs text-stone-400 mb-3 font-medium">Selecciona una tonalidad</p>
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
}