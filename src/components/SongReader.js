import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useLocation, Link } from 'react-router-dom';
import circulos from "./circulos";
import { API_URL } from './config';
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import toRoman from "./toRoman";
import SongSearch from "./SongSearch";
import Tuner from "./tools/Tuner";
import Metronome from "./tools/Metronome";

const SongReader = () => {
  const location = useLocation();
  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [compass, setCompass] = useState("4/4");
  const [compas, setCompas] = useState("4/4");
  const [semitono, setSemitono] = useState(0);
  const [showToneMenu, setShowToneMenu] = useState(false);

  // Estado para el panel de Herramientas ('tuner', 'metronome' o null)
  const [activeTool, setActiveTool] = useState(null);

  // Estados para el Pad Ambiental Worship, Volumen y Pulso de Tempo
  const [isPlayingPad, setIsPlayingPad] = useState(false);
  const [padVolume, setPadVolume] = useState(0.5); // Volumen del Pad (0.0 a 1.0)
  const [tempoBeat, setTempoBeat] = useState(false);
  const audioCtxRef = useRef(null);
  const padOscillatorsRef = useRef([]);
  const padGainRef = useRef(null);

  // Posiciones para portal flotante de tonalidad
  const [toneMenuCoords, setToneMenuCoords] = useState({ top: 0, left: 0, width: 0 });

  const toneBtnRef = useRef(null);
  const toneMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    window.location.href = '/';
  };

  const esMenor = tono.endsWith("m");

  const notasBase = [
    "C", "D♭", "D", "E♭", "E", "F",
    "G♭", "G", "A♭", "A", "B♭", "B"
  ];
  const tonos = esMenor ? notasBase.map(n => `${n}m`) : notasBase;

  const [selectedSongId, setSelectedSongId] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");

  // Extractor de nota raíz (Ej: "A♭m" -> "A♭", "C#m" -> "C#", "G" -> "G")
  const obtenerNotaRaiz = (strTono) => {
    if (!strTono) return "C";
    const match = strTono.match(/^[A-Ga-g](#|♭|b)?/);
    return match ? match[0].replace('b', '♭') : "C";
  };

  const notaRaiz = obtenerNotaRaiz(tono);

  // --- TABLA DE FRECUENCIAS BASE ---
  const FrecuenciasNotas = {
    "C": 130.81, "C#": 138.59, "D♭": 138.59, "D": 146.83, "D#": 155.56,
    "E♭": 155.56, "E": 164.81, "F": 174.61, "F#": 185.00, "G♭": 185.00,
    "G": 196.00, "G#": 207.65, "A♭": 207.65, "A": 220.00, "A#": 233.08,
    "B♭": 233.08, "B": 246.94
  };

  // Generador de Impulso para Reverb con Shimmer Orgánico, Etéreo y Modulado (Cuerpo celestial y expansivo)
  const createShimmerReverbBuffer = (ctx) => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 6.5; // Cola de reverb masiva y envolvente (6.5s) para suspender el tiempo
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t / 1.6); // Caída suave, cálida y sedosa
      // Modulación fluida y armónica cruzada para el efecto Shimmer (evita asperezas metálicas)
      const shimmerMod = Math.sin(t * 6.28 * 1.5) * 0.25 + 0.75;
      const noise = (Math.random() * 2 - 1);
      left[i] = noise * decay * shimmerMod;
      right[i] = noise * decay * (1.1 - shimmerMod * 0.2);
    }
    return buffer;
  };

  // Ajuste en tiempo real del volumen del Pad sin reiniciar el sonido
  useEffect(() => {
    if (padGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const targetGain = padVolume * 0.12;
      padGainRef.current.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }, [padVolume]);

  const stopAmbientPad = () => {
    if (padGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      // Release progresivo y sumamente suave de 4 segundos para fundir la atmósfera celestial
      padGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 4.0);
      setTimeout(() => {
        padOscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch (e) { }
        });
        padOscillatorsRef.current = [];
        setIsPlayingPad(false);
      }, 4000);
    } else {
      setIsPlayingPad(false);
    }
  };

  // --- MOTOR SINTETIZADOR AMBIENTAL CON SHIMMER CELESTIAL Y FEEDBACK ORGÁNICO ---
  const startAmbientPad = (rootNote) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    padOscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) { }
    });
    padOscillatorsRef.current = [];

    const baseFreq = FrecuenciasNotas[rootNote] || 130.81;
    const now = audioCtxRef.current.currentTime;

    // Node Master Gain (Con Attack ultra-lento y orgánico de 4s para un swell sumamente emotivo)
    const masterGain = audioCtxRef.current.createGain();
    const targetGain = padVolume * 0.12;
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(targetGain, 0.001), now + 4.0);

    // Filtro Lowpass Modelado para calidez profunda y orgánica (elimina frecuencias duras)
    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now); // Suaviza la zona media y realza el cuerpo cálido
    filter.Q.setValueAtTime(0.5, now);

    masterGain.connect(filter);

    // CADENA DE DELAY AMBIENTAL EXPANSIVO (Estilo Cloud/Timeline con repeticiones etéreas y difusas)
    const delayNode = audioCtxRef.current.createDelay();
    delayNode.delayTime.setValueAtTime(0.68, now); // Delay amplio y respirable

    const delayFeedback = audioCtxRef.current.createGain();
    delayFeedback.gain.setValueAtTime(0.55, now); // Feedback rico y envolvente para colas musicales interconectadas

    const delayFilter = audioCtxRef.current.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.setValueAtTime(900, now); // Oscurece progresivamente cada eco para disolver los transitorios

    filter.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // CADENA DE REVERB CON SHIMMER ETÉREO (Octava superior flotante, cantarina y celestial)
    const convolver = audioCtxRef.current.createConvolver();
    convolver.buffer = createShimmerReverbBuffer(audioCtxRef.current);

    const wetGain = audioCtxRef.current.createGain();
    wetGain.gain.setValueAtTime(0.8, now); // Inundado de espacio y profundidad emocional

    const dryGain = audioCtxRef.current.createGain();
    dryGain.gain.setValueAtTime(0.4, now);

    filter.connect(dryGain);
    filter.connect(convolver);
    delayNode.connect(convolver); // Las repeticiones alimentan la reverb creando una neblina armónica
    convolver.connect(wetGain);

    dryGain.connect(audioCtxRef.current.destination);
    wetGain.connect(audioCtxRef.current.destination);
    delayNode.connect(audioCtxRef.current.destination);

    // CAPAS DE RANGO AMPLIO + SHIMMER ORGÁNICO (Sub cálido, fundamentales corales en estéreo, quintas y octavas flotantes)
    const layers = [
      { freq: baseFreq / 2, type: "sine", gain: 0.65, detune: 0 },         // Sub-Bass (-1 Oct) profundo
      { freq: baseFreq, type: "triangle", gain: 0.38, detune: -18 },     // Fundamental Izq (Ancho y cálido)
      { freq: baseFreq, type: "triangle", gain: 0.38, detune: 18 },      // Fundamental Der (Width Estéreo profundo)
      { freq: baseFreq * 1.4983, type: "sine", gain: 0.25, detune: 5 },  // Quinta Justa armónica
      { freq: baseFreq * 2, type: "sine", gain: 0.20, detune: -10 },     // Octava +1 (Cuerpo vocal suave)
      { freq: baseFreq * 2, type: "triangle", gain: 0.18, detune: 10 },  // Octava +1 Detune corpulento
      { freq: baseFreq * 4, type: "sine", gain: 0.14, detune: -6 },     // Octava +2 (SHIMMER CELESTIAL: Brillo etéreo y mágico)
      { freq: baseFreq * 4, type: "triangle", gain: 0.11, detune: 7 }    // Octava +2 armónico etéreo abierto
    ];

    layers.forEach(({ freq, type, gain, detune }) => {
      const osc = audioCtxRef.current.createOscillator();
      const oscGain = audioCtxRef.current.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

      oscGain.gain.setValueAtTime(gain, now);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      padOscillatorsRef.current.push(osc);
    });

    padGainRef.current = masterGain;
    setIsPlayingPad(true);
  };

  const toggleAmbientPad = () => {
    if (isPlayingPad) {
      stopAmbientPad();
    } else {
      startAmbientPad(notaRaiz);
    }
  };

  // Re-sintonizar el pad al cambiar la tonalidad
  useEffect(() => {
    if (isPlayingPad) {
      startAmbientPad(notaRaiz);
    }
  }, [tono]);

  useEffect(() => {
    return () => {
      stopAmbientPad();
    };
  }, []);

  // --- EFECTO PULSO VISUAL DE TEMPO ---
  useEffect(() => {
    if (!selectedSongId || !tempo) return;

    const bpmNum = parseInt(tempo, 10);
    if (isNaN(bpmNum) || bpmNum <= 0) return;

    const intervalMs = (60 / bpmNum) * 1000;

    const interval = setInterval(() => {
      setTempoBeat(true);
      setTimeout(() => setTempoBeat(false), 120);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [selectedSongId, tempo]);

  const updateToneCoords = () => {
    if (toneBtnRef.current) {
      const rect = toneBtnRef.current.getBoundingClientRect();
      setToneMenuCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 288)
      });
    }
  };

  const toggleToneMenu = () => {
    if (!showToneMenu) {
      updateToneCoords();
    }
    setShowToneMenu(!showToneMenu);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toneBtnRef.current && !toneBtnRef.current.contains(event.target) &&
        toneMenuRef.current && !toneMenuRef.current.contains(event.target)
      ) {
        setShowToneMenu(false);
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
    const cleanKey = currentKey.replace(/m$/, '');
    const useFlats = flatKeys.includes(cleanKey);

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
    const cleanTonoActual = tono.replace(/m$/, '');
    const cleanNuevoTono = nuevoTono.replace(/m$/, '');

    const notas = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
    const indexActual = notas.indexOf(cleanTonoActual) !== -1 ? notas.indexOf(cleanTonoActual) : 0;
    const indexNuevo = notas.indexOf(cleanNuevoTono) !== -1 ? notas.indexOf(cleanNuevoTono) : 0;
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

  return (
    <div className="app-container p-4 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md shadow-md border-b">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3 sm:gap-4 relative">

          <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 flex-col gap-2 opacity-40 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full border border-current bg-muted" />
          </div>
          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 flex-col gap-2 opacity-40 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full border border-current bg-muted" />
          </div>

          <div className="flex items-center space-x-3.5 text-center sm:text-left">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl border border-border shadow-inner relative overflow-hidden group shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10 transition-transform duration-300 group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" title="Recording / Edit Mode" />
                  <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                    EASYCHART
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-primary-foreground mt-0.5">
                Viewer & Browser
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              to="/create"
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Song</span>
            </Link>
            <Link
              to="/edit"
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="hidden sm:inline">Search & Edit</span>
            </Link>
            <Link
              to="/setlist"
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Setlist</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
              title="Cerrar Sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* BUSCADOR */}
        <div className="app-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5853] mb-2">
              Search by artist or song
            </label>
            <SongSearch
              onSelectSong={(song) => loadSong(song.id)}
              placeholder="Search by artist or song..."
            />
          </div>

          {/* CONTROLES DE TONALIDAD / EXPORTACIÓN */}
          {selectedSongId && (
            <div className="pt-4 border-t border-[#D3CEBE] space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#5C5853] flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#2C2A29]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Tonalidad Directa
                  </label>
                  <span className="text-xs font-bold text-[#2C2A29] bg-[#E8E5DC] px-2.5 py-0.5 rounded-full border border-[#D3CEBE]">
                    Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                  </span>
                </div>

                <div>
                  <button
                    ref={toneBtnRef}
                    type="button"
                    onClick={toggleToneMenu}
                    className="flex items-center justify-between w-full sm:w-64 px-4 py-3 rounded-xl bg-[#2C2A29] text-[#FAF9F5] font-bold shadow-sm hover:bg-[#1A1918] transition cursor-pointer border border-[#1A1918]"
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
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] hover:bg-[#F2F0EA] text-[#2C2A29] rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Bajar medio tono (-1 semitono)"
                >
                  <span className="w-6 h-6 rounded-lg bg-[#EBE9E1] group-hover:bg-[#2C2A29] group-hover:text-[#FAF9F5] text-[#2C2A29] flex items-center justify-center text-sm font-black transition-colors">
                    ♭
                  </span>
                  <span>Bajar Tono (-1 st)</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] hover:bg-[#F2F0EA] text-[#2C2A29] rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer group"
                  title="Subir medio tono (+1 semitono)"
                >
                  <span>Subir Tono (+1 st)</span>
                  <span className="w-6 h-6 rounded-lg bg-[#EBE9E1] group-hover:bg-[#2C2A29] group-hover:text-[#FAF9F5] text-[#2C2A29] flex items-center justify-center text-sm font-black transition-colors">
                    ♯
                  </span>
                </button>

                <div className="w-full md:w-auto flex-1">
                  <PDFDownloadLink
                    document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                    fileName={`${(tituloCancion || 'chart').replace(/\s+/g, '_')}_${tono}.pdf`}
                    className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-[#2C2A29] hover:bg-[#1A1918] text-[#FAF9F5] font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer border border-[#1A1918]"
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

        {/* NÚCLEO / SECCIÓN DE HERRAMIENTAS (TOOLS HUB) */}
        <div className="app-card p-4 space-y-3 border border-[#D3CEBE]">
          <div className="flex items-center justify-between pb-2 border-b border-[#D3CEBE]">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#5C5853] flex items-center gap-2">
              🛠️ Herramientas
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'tuner' ? null : 'tuner')}
                className={`px-3 py-1.5 font-mono font-bold text-xs rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${activeTool === 'tuner'
                  ? 'bg-[#2C2A29] text-[#FAF9F5] border-[#1A1918]'
                  : 'bg-[#EBE9E1] text-[#2C2A29] border-[#D3CEBE] hover:bg-[#F2F0EA]'
                  }`}
              >
                🎸 Afinador
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'metronome' ? null : 'metronome')}
                className={`px-3 py-1.5 font-mono font-bold text-xs rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${activeTool === 'metronome'
                  ? 'bg-[#2C2A29] text-[#FAF9F5] border-[#1A1918]'
                  : 'bg-[#EBE9E1] text-[#2C2A29] border-[#D3CEBE] hover:bg-[#F2F0EA]'
                  }`}
              >
                ⏱️ Metrónomo
              </button>
            </div>
          </div>

          {activeTool === 'tuner' && (
            <div className="pt-2 animate-fadeIn">
              <Tuner />
            </div>
          )}

          {activeTool === 'metronome' && (
            <div className="p-4 bg-stone-100/60 rounded-xl border border-dashed border-stone-300 text-center text-xs font-mono text-stone-600">
              <Metronome externalBpm={tempo} />
            </div>
          )}
        </div>

        {/* VISUALIZADOR DEL CHART DE ACORDES */}
        {selectedSongId ? (
          <div className="app-card p-8" style={{
            fontFamily: 'Architects Daughter, cursive',
          }}>
            <div className="text-center mb-8 border-b-2 border-[#2C2A29] pb-6 relative">
              <h2 className="text-3xl font-bold mb-2 text-[#2C2A29] tracking-wide">{tituloCancion} - {artista || "Autor"}</h2>

              {/* CONTENEDOR DE METRÓNOMO VISUAL, PAD AMBIENTAL Y SLIDER DE VOLUMEN */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                {/* LED VISUAL DE TEMPO */}
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#E8E5DC] rounded-xl border border-[#D3CEBE] shadow-sm">
                  <span
                    className={`w-3 h-3 rounded-full transition-all duration-75 ${tempoBeat
                      ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)] scale-110"
                      : "bg-stone-400/60"
                      }`}
                    title="Pulso de tempo visual"
                  />
                  <span className="text-xs font-extrabold text-[#2C2A29] font-mono tracking-wide">
                    Tonalidad: {tono} • Compás: {compas} • {tempo} BPM
                  </span>
                </div>

                {/* BOTÓN Y DESLIZADOR DE VOLUMEN DE PAD WORSHIP CON SHIMMER/DELAY */}
                <div className="flex items-center gap-3 px-3.5 py-1.5 bg-[#E8E5DC] rounded-xl border border-[#D3CEBE] shadow-sm">
                  <button
                    type="button"
                    onClick={toggleAmbientPad}
                    className={`px-3 py-1 font-mono font-bold text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 ${isPlayingPad
                      ? "bg-amber-600 text-white border-amber-700 shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                      : "bg-[#FAF9F5] text-[#2C2A29] border-[#D3CEBE] hover:bg-[#F2F0EA]"
                      }`}
                    title="Activar o desactivar Pad ambiental con Shimmer y Delay"
                  >
                    <span className={`w-2 h-2 rounded-full ${isPlayingPad ? "bg-white animate-ping" : "bg-stone-400"}`} />
                    ✨ {isPlayingPad ? `Ambient Shimmer (${notaRaiz})` : `Activar Pad Shimmer (${notaRaiz})`}
                  </button>

                  {/* SLIDER DE VOLUMEN DEL PAD */}
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#2C2A29]">
                    <span title="Volumen del Pad">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={padVolume}
                      onChange={(e) => setPadVolume(parseFloat(e.target.value))}
                      className="w-20 accent-amber-600 cursor-pointer h-1.5 bg-stone-300 rounded-lg"
                      title={`Volumen del Pad: ${Math.round(padVolume * 100)}%`}
                    />
                    <span className="w-8 text-right font-bold text-[11px]">
                      {Math.round(padVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <Link
                  to={`/edit/${selectedSongId}`}
                  className="inline-flex items-center px-4 py-2 bg-[#383023] text-[#FAF9F5] hover:bg-[#252017] font-mono text-xs font-semibold tracking-wider uppercase rounded-xl transition shadow-sm border border-[#1A1918]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar esta canción (/edit/{selectedSongId})
                </Link>
              </div>
            </div>

            {secciones.map((sec, secIdx) => (
              <div key={secIdx} className="mb-10">
                <h3 className="text-xl font-bold border-b-2 border-[#2C2A29] text-[#2C2A29] pb-1 mb-6 uppercase tracking-wider">
                  {sec.nombre} • {sec.compas}
                </h3>

                {sec.lineas.map((linea, lIdx) => {
                  let measureCount = 0;
                  for (let i = 0; i < lIdx; i++) {
                    measureCount += sec.lineas[i].compasses.length;
                  }

                  return (
                    <div key={lIdx} className="mb-8 flex items-center">
                      {linea.repetir && <span className="text-2xl mx-2 text-[#2C2A29] font-black">%</span>}

                      <div className="flex justify-evenly gap-2 flex-1">
                        {linea.compasses.map((compass, cIdx) => {
                          measureCount++;
                          const divisiones = compass.acordes.length;

                          return (
                            <div key={cIdx} className="relative w-1/4 border-2 border-[#2C2A29] px-2 py-2 bg-[#FAF9F5] my-1 rounded-md shadow-sm">
                              <div className="absolute -top-3 left-0 right-0 text-center">
                                <span className="text-xs text-[#5C5853] font-sans bg-[#FAF9F5] px-1 font-semibold">{toRoman(measureCount)}</span>
                              </div>

                              <div
                                className={`grid gap-2 mt-1 divisiones-${divisiones}`}
                                style={{
                                  gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`,
                                  textAlign: 'center',
                                }}
                              >
                                {compass.acordes.map((acorde, dIdx) => (
                                  <div key={dIdx} className="chord-box-global py-1">
                                    {acorde.valor || "-"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {linea.repetir && <span className="text-2xl mx-2 text-[#2C2A29] font-black">%</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="app-card p-12 text-center border-2 border-dashed border-[#D3CEBE] shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#8C867E] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-[#5C5853] font-medium">Search for a song above to view the chart</p>
          </div>
        )}
      </div>

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
          className="rounded-2xl border-2 border-[#2C2A29] bg-[#FAF9F5] shadow-xl p-3"
        >
          <p className="text-xs text-[#5C5853] mb-3">Selecciona una tonalidad</p>
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
                  className={`py-2 rounded-xl font-bold transition cursor-pointer border ${activo ? "bg-[#2C2A29] text-[#FAF9F5] border-[#1A1918]" : "bg-[#EBE9E1] text-[#2C2A29] border-[#D3CEBE] hover:bg-[#F2F0EA]"
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