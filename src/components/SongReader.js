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
  const [showLyricModal, setShowLyricModal] = useState(false);
  const [songLyrics, setSongLyrics] = useState("");

  const userRole = localStorage.getItem('easychart_role') || 'reader';
  const canEdit = userRole === 'admin' || userRole === 'editor';

  const [activeTool, setActiveTool] = useState(null);

  const [isPlayingPad, setIsPlayingPad] = useState(false);
  const [padVolume, setPadVolume] = useState(0.5);
  const [tempoBeat, setTempoBeat] = useState(false);
  const audioCtxRef = useRef(null);
  const padOscillatorsRef = useRef([]);
  const padGainRef = useRef(null);

  const [toneMenuCoords, setToneMenuCoords] = useState({ top: 0, left: 0, width: 0 });

  const toneBtnRef = useRef(null);
  const toneMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    localStorage.removeItem('easychart_role');
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

  const obtenerNotaRaiz = (strTono) => {
    if (!strTono) return "C";
    const match = strTono.match(/^[A-Ga-g](#|♭|b)?/);
    return match ? match[0].replace('b', '♭') : "C";
  };

  const notaRaiz = obtenerNotaRaiz(tono);

  const FrecuenciasNotas = {
    "C": 130.81, "C#": 138.59, "D♭": 138.59, "D": 146.83, "D#": 155.56,
    "E♭": 155.56, "E": 164.81, "F": 174.61, "F#": 185.00, "G♭": 185.00,
    "G": 196.00, "G#": 207.65, "A♭": 207.65, "A": 220.00, "A#": 233.08,
    "B♭": 233.08, "B": 246.94
  };

  const createShimmerReverbBuffer = (ctx) => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 6.5;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t / 1.6);
      const shimmerMod = Math.sin(t * 6.28 * 1.5) * 0.25 + 0.75;
      const noise = (Math.random() * 2 - 1);
      left[i] = noise * decay * shimmerMod;
      right[i] = noise * decay * (1.1 - shimmerMod * 0.2);
    }
    return buffer;
  };

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

    const masterGain = audioCtxRef.current.createGain();
    const targetGain = padVolume * 0.12;
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(targetGain, 0.001), now + 4.0);

    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(0.5, now);

    masterGain.connect(filter);

    const delayNode = audioCtxRef.current.createDelay();
    delayNode.delayTime.setValueAtTime(0.68, now);

    const delayFeedback = audioCtxRef.current.createGain();
    delayFeedback.gain.setValueAtTime(0.55, now);

    const delayFilter = audioCtxRef.current.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.setValueAtTime(900, now);

    filter.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    const convolver = audioCtxRef.current.createConvolver();
    convolver.buffer = createShimmerReverbBuffer(audioCtxRef.current);

    const wetGain = audioCtxRef.current.createGain();
    wetGain.gain.setValueAtTime(0.8, now);

    const dryGain = audioCtxRef.current.createGain();
    dryGain.gain.setValueAtTime(0.4, now);

    filter.connect(dryGain);
    filter.connect(convolver);
    delayNode.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(audioCtxRef.current.destination);
    wetGain.connect(audioCtxRef.current.destination);
    delayNode.connect(audioCtxRef.current.destination);

    const layers = [
      { freq: baseFreq / 2, type: "sine", gain: 0.65, detune: 0 },
      { freq: baseFreq, type: "triangle", gain: 0.38, detune: -18 },
      { freq: baseFreq, type: "triangle", gain: 0.38, detune: 18 },
      { freq: baseFreq * 1.4983, type: "sine", gain: 0.25, detune: 5 },
      { freq: baseFreq * 2, type: "sine", gain: 0.20, detune: -10 },
      { freq: baseFreq * 2, type: "triangle", gain: 0.18, detune: 10 },
      { freq: baseFreq * 4, type: "sine", gain: 0.14, detune: -6 },
      { freq: baseFreq * 4, type: "triangle", gain: 0.11, detune: 7 }
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
        localStorage.removeItem('easychart_role');
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
      setSongLyrics(song.lyrics || "");
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

  let modalSections = [];
  let modalRawText = "";

  if (typeof songLyrics === 'string' && songLyrics.trim() !== '') {
    if (songLyrics.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(songLyrics);
        modalSections = parsed?.sections || parsed?.lyrics?.sections || [];
      } catch (e) {
        modalRawText = songLyrics;
      }
    } else {
      modalRawText = songLyrics;
    }
  }

  return (
    <div className="app-container p-4 pb-20">
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md shadow-md border-b">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3 sm:gap-4 relative">

          <div className="flex items-center space-x-3.5 text-center sm:text-left">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl border border-border shadow-inner relative overflow-hidden group shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10 transition-transform duration-300 group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                  <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                    EASYCHART ({userRole})
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-primary-foreground mt-0.5">
                Viewer & Browser
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
            {canEdit && (
              <Link
                to="/create"
                className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
              >
                <span className="hidden sm:inline">Add Song</span>
              </Link>
            )}

            {canEdit && (
              <Link
                to="/edit"
                className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
              >
                <span className="hidden sm:inline">Search & Edit</span>
              </Link>
            )}

            <Link
              to="/setlist"
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
            >
              <span className="hidden sm:inline">Setlist</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all hover:brightness-90 border shadow-sm cursor-pointer uppercase tracking-wider active:scale-95"
              title="Cerrar Sesión"
            >
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
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

          {selectedSongId && (
            <div className="pt-4 border-t border-[#D3CEBE] space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#5C5853] flex items-center">
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
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] text-[#2C2A29] rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer group"
                >
                  <span>Bajar Tono (-1 st)</span>
                </button>

                <button
                  type="button"
                  onClick={() => ajustarSemitono(1)}
                  className="w-full md:w-auto flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#FAF9F5] border border-[#D3CEBE] hover:border-[#2C2A29] text-[#2C2A29] rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer group"
                >
                  <span>Subir Tono (+1 st)</span>
                </button>

                <div className="w-full md:w-auto flex-1">
                  <PDFDownloadLink
                    document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                    fileName={`${(tituloCancion || 'chart').replace(/\s+/g, '_')}_${tono}.pdf`}
                    className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-[#2C2A29] hover:bg-[#1A1918] text-[#FAF9F5] font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer border border-[#1A1918]"
                  >
                    {({ loading, error }) => (
                      loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Exportar a PDF'
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="app-card p-4 space-y-3 border border-[#D3CEBE]">
          <div className="flex items-center justify-between pb-2 border-b border-[#D3CEBE]">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#5C5853] flex items-center gap-2">
              🛠️ Herramientas
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'tuner' ? null : 'tuner')}
                className={`px-3 py-1.5 font-mono font-bold text-xs rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${activeTool === 'tuner' ? 'bg-[#2C2A29] text-[#FAF9F5]' : 'bg-[#EBE9E1] text-[#2C2A29]'}`}
              >
                🎸 Afinador
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'metronome' ? null : 'metronome')}
                className={`px-3 py-1.5 font-mono font-bold text-xs rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${activeTool === 'metronome' ? 'bg-[#2C2A29] text-[#FAF9F5]' : 'bg-[#EBE9E1] text-[#2C2A29]'}`}
              >
                ⏱️ Metrónomo
              </button>
            </div>
          </div>

          {activeTool === 'tuner' && <div className="pt-2"><Tuner /></div>}
          {activeTool === 'metronome' && <div className="p-4 bg-stone-100/60 rounded-xl text-center"><Metronome externalBpm={tempo} /></div>}
        </div>

        {selectedSongId ? (
          <div className="app-card p-8" style={{ fontFamily: 'Architects Daughter, cursive' }}>
            <div className="text-center mb-8 border-b-2 border-[#2C2A29] pb-6 relative">
              <h2 className="text-3xl font-bold mb-2 text-[#2C2A29] tracking-wide">{tituloCancion} - {artista || "Autor"}</h2>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#E8E5DC] rounded-xl border border-[#D3CEBE] shadow-sm">
                  <span className={`w-3 h-3 rounded-full transition-all duration-75 ${tempoBeat ? "bg-amber-500 scale-110" : "bg-stone-400/60"}`} />
                  <span className="text-xs font-extrabold text-[#2C2A29] font-mono tracking-wide">
                    Tonalidad: {tono} • Compás: {compas} • {tempo} BPM
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-1.5 bg-[#E8E5DC] rounded-xl border border-[#D3CEBE] shadow-sm">
                  <button
                    type="button"
                    onClick={toggleAmbientPad}
                    className={`px-3 py-1 font-mono font-bold text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${isPlayingPad ? "bg-amber-600 text-white" : "bg-[#FAF9F5] text-[#2C2A29]"}`}
                  >
                    ✨ {isPlayingPad ? `Ambient Shimmer (${notaRaiz})` : `Activar Pad Shimmer (${notaRaiz})`}
                  </button>

                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#2C2A29]">
                    <span>🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={padVolume}
                      onChange={(e) => setPadVolume(parseFloat(e.target.value))}
                      className="w-20 accent-amber-600 cursor-pointer h-1.5 bg-stone-300 rounded-lg"
                    />
                    <span className="w-8 text-right font-bold text-[11px]">{Math.round(padVolume * 100)}%</span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="mt-4 flex justify-center">
                  <Link
                    to={`/edit/${selectedSongId}`}
                    className="inline-flex items-center px-4 py-2 bg-[#383023] text-[#FAF9F5] font-mono text-xs font-semibold uppercase rounded-xl transition shadow-sm border border-[#1A1918]"
                  >
                    Edit Chart (/edit/{selectedSongId})
                  </Link>
                </div>
              )}

              {songLyrics !== 'No Lyrics' && (
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLyricModal(true)}
                    className="app-button-secondary flex items-center justify-center px-3.5 py-2 font-mono font-semibold text-xs rounded-xl transition-all border shadow-sm cursor-pointer uppercase tracking-wider"
                  >
                    Show Lyrics
                  </button>
                  <Link
                    to={`/lyrics/edit/${selectedSongId}`}
                    className="inline-flex items-center px-4 py-2 bg-[#383023] text-[#FAF9F5] font-mono text-xs font-semibold uppercase rounded-xl transition shadow-sm border border-[#1A1918]"
                  >
                    Edit Lyrics (/lyrics/edit/{selectedSongId})
                  </Link>
                </div>
              )}
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
                                style={{ gridTemplateColumns: `repeat(${divisiones}, minmax(0, 1fr))`, textAlign: 'center' }}
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
            <p className="text-[#5C5853] font-medium">Search for a song above to view the chart</p>
          </div>
        )}
      </div>

      {showToneMenu && ReactDOM.createPortal(
        <div
          ref={toneMenuRef}
          style={{ position: 'absolute', top: `${toneMenuCoords.top}px`, left: `${toneMenuCoords.left}px`, width: `${toneMenuCoords.width}px`, zIndex: 99999 }}
          className="rounded-2xl border-2 border-[#2C2A29] bg-[#FAF9F5] shadow-xl p-3"
        >
          <p className="text-xs text-[#5C5853] mb-3">Selecciona una tonalidad</p>
          <div className="grid grid-cols-4 gap-2">
            {tonos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { cambiarTonalidad(t); setShowToneMenu(false); }}
                className={`py-2 rounded-xl font-bold transition cursor-pointer border ${tono === t ? "bg-[#2C2A29] text-[#FAF9F5]" : "bg-[#EBE9E1] text-[#2C2A29]"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE LETRAS CON FUENTE GLOBAL DE CHARTS */}
      {showLyricModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="app-card w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#FAF9F5] border-2 border-[#2C2A29] shadow-2xl rounded-2xl overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D3CEBE] bg-[#E8E5DC]">
              <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-[#2C2A29]">
                Letra de la Canción: {tituloCancion}
              </h3>
              <button
                type="button"
                onClick={() => setShowLyricModal(false)}
                className="w-8 h-8 rounded-lg bg-[#2C2A29] text-[#FAF9F5] flex items-center justify-center font-bold hover:bg-[#1A1918] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans text-stone-800">
              {modalSections.length > 0 ? (
                modalSections.map((sec, idx) => (
                  <div key={idx} className="bg-white/70 p-4 rounded-xl border border-[#D3CEBE] shadow-sm space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#2C2A29] text-[#FAF9F5] font-mono text-[10px] font-bold uppercase tracking-wider">
                      {sec.label || "Sección"}
                    </span>
                    <p className="chord-box-global text-base whitespace-pre-line leading-relaxed pt-2 p-3 text-left">
                      {sec.content || ""}
                    </p>
                  </div>
                ))
              ) : modalRawText ? (
                <p className="chord-box-global text-base whitespace-pre-line p-4 text-left">
                  {modalRawText}
                </p>
              ) : (
                <p className="text-center text-stone-500 font-mono text-sm py-8">
                  No hay letra disponible para esta canción.
                </p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#D3CEBE] bg-[#E8E5DC] flex justify-end">
              <button
                type="button"
                onClick={() => setShowLyricModal(false)}
                className="px-4 py-2 bg-[#2C2A29] text-[#FAF9F5] font-mono text-xs font-semibold rounded-xl hover:bg-[#1A1918] transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default SongReader;