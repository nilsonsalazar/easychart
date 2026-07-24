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
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md shadow-2xl py-4 px-6 rounded-2xl mb-6 border border-border">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary tracking-tight">
                EasyChart Creator
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Chord Chart Editor & Creator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center px-4 py-2.5 bg-secondary text-secondary-foreground font-medium text-sm rounded-xl hover:bg-secondary/80 transition-all border border-border"
            >
              ← Volver a Consulta
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center px-3.5 py-2.5 bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive font-medium text-sm rounded-xl transition-all border border-border cursor-pointer"
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
            className="text-2xl sm:text-3xl font-black w-full text-center bg-transparent focus:outline-none text-foreground placeholder-muted-foreground tracking-tight"
            placeholder="Título de la canción"
          />
          <input
            type="text"
            value={artista}
            onChange={(e) => setArtista(e.target.value)}
            className="text-lg sm:text-xl font-semibold w-full text-center bg-transparent focus:outline-none text-muted-foreground placeholder-muted-foreground"
            placeholder="Autor o Artista"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-xl border border-border p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary/90 mb-2">
              Buscar título o artista
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
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
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder-muted-foreground font-medium"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Tonalidad Directa
                </label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                </span>
              </div>

              <div>
                <button
                  ref={toneBtnRef}
                  type="button"
                  onClick={toggleToneMenu}
                  className="flex items-center justify-between w-full sm:w-64 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-primary/20 transition cursor-pointer"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Tempo (BPM)</label>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Tempo"
                  min="0"
                  max="360"
                  step="1"
                  className="w-full md:w-32 rounded-xl border border-border bg-background py-2.5 px-3 text-sm font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="w-full md:w-auto flex-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => ajustarSemitono(-1)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 text-secondary-foreground rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                >
                  <span className="w-5 h-5 rounded bg-muted group-hover:bg-primary/20 text-primary flex items-center justify-center font-black">♭</span>
                  <span>-1 st</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 text-secondary-foreground rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer group"
                >
                  <span>+1 st</span>
                  <span className="w-5 h-5 rounded bg-muted group-hover:bg-primary/20 text-primary flex items-center justify-center font-black">♯</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
              <button
                onClick={() => selectedSongId ? updateSong(selectedSongId) : saveSong()}
                className="flex items-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
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
                className="flex items-center px-5 py-2.5 bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {showPDFOptions ? 'Ocultar PDF' : 'Exportar a PDF'}
              </button>
            </div>

            {showPDFOptions && (
              <div className="mt-3 p-4 border border-border rounded-xl bg-background/60">
                <PDFDownloadLink
                  document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                  fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                  className="block w-full text-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {({ loading, error }) => (
                    loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-xl border border-border p-6 flex flex-col md:flex-row items-center gap-3">
          <input
            type="text"
            value={nuevaSeccionNombre}
            onChange={(e) => setNuevaSeccionNombre(e.target.value)}
            placeholder="Nombre de nueva sección (ej. Coro, Intro...)"
            className="flex-1 w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-foreground font-medium"
          />
          <button
            type="button"
            onClick={agregarSeccion}
            className="w-full md:w-auto px-5 py-3 bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 text-primary font-bold text-sm rounded-xl transition cursor-pointer"
          >
            + Agregar Sección
          </button>
        </div>

        {secciones.map((sec, secIdx) => (
          <div key={sec.id} className="bg-card/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-border text-foreground">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/50">
              {editingSeccionId === sec.id ? (
                <input
                  type="text"
                  defaultValue={sec.nombre}
                  onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                  autoFocus
                  className="px-3 py-1.5 bg-background border border-primary/60 rounded-xl text-foreground font-bold text-base focus:outline-none"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-primary text-lg uppercase tracking-wider">
                    {sec.nombre}
                  </h3>
                  <button
                    onClick={() => setEditingSeccionId(sec.id)}
                    className="text-muted-foreground hover:text-primary transition text-sm cursor-pointer"
                    title="Editar nombre"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <button
                onClick={() => eliminarSeccion(sec.id)}
                className="text-xs font-bold uppercase tracking-wider text-destructive hover:text-destructive/80 px-3.5 py-1.5 bg-destructive/10 rounded-xl border border-destructive/20 transition cursor-pointer"
              >
                Eliminar Sección
              </button>
            </div>

            <div className="p-6 space-y-6">
              {sec.lineas.map((linea, lIdx) => (
                <div key={linea.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleRepetirLinea(sec.id, lIdx)}
                    className={`px-3 py-1 rounded-lg border font-mono text-sm font-bold transition cursor-pointer ${linea.repetir ? "bg-primary/20 border-primary text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    title="Alternar barra de repetición (% / %)"
                  >
                    {linea.repetir ? "% %" : "Repetir"}
                  </button>

                  <div className="flex justify-evenly gap-0 flex-1">
                    {linea.compasses.map((compass, cIdx) => {
                      const divisiones = compass.acordes.length;

                      return (
                        <div key={compass.id} className="relative w-1/4 border-l border-r border-border px-2 py-1 bg-background/50 my-1 rounded-sm">
                          <div className="absolute -top-5 left-0 right-0 flex justify-between px-1">
                            <span className="text-[10px] text-muted-foreground font-sans">{toRoman(cIdx + 1)}</span>
                            <div className="flex gap-1">
                              {[1, 2, 4].map(divOpt => (
                                <button
                                  key={divOpt}
                                  type="button"
                                  onClick={() => cambiarDivisiones(sec.id, lIdx, cIdx, divOpt)}
                                  className={`text-[10px] px-1 rounded font-sans cursor-pointer ${divisiones === divOpt ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
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
                                className="w-full bg-secondary/90 border border-border rounded text-center text-xl font-bold text-foreground focus:outline-none focus:border-primary py-1"
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
                  className="px-4 py-2 bg-secondary border border-border hover:border-primary/50 text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  + Agregar Línea
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
          className="bg-card border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-border"
        >
          {filteredSongs.map(song => (
            <div
              key={song.id}
              className={`p-3.5 hover:bg-primary/10 transition-colors cursor-pointer flex justify-between items-center ${selectedSongId === song.id ? 'bg-primary/20' : ''}`}
              onClick={() => {
                loadSong(song.id);
                setSearchTerm(song.title);
                setSelectedSongId(song.id);
                setShowSongDropdown(false);
              }}
            >
              <div>
                <div className="font-semibold text-foreground">{song.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {song.artist ? `Artista: ${song.artist} • ` : ''}Tonalidad: {song.key_signature}
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-secondary text-primary border border-border rounded-lg">
                {song.tempo} BPM
              </span>
            </div>
          ))}
        </div>,
        document.body
      )}

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
          className="rounded-2xl border border-border bg-card shadow-2xl p-3"
        >
          <p className="text-xs text-muted-foreground mb-3 font-medium">Selecciona una tonalidad</p>
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
                  className={`py-2 rounded-xl font-bold transition cursor-pointer ${activo ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary"
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