import React, { useState, useEffect, useRef } from "react";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Presets de afinación comunes
const TUNING_PRESETS = {
    chromatic: { name: "Cromático", notes: [] },
    guitar_std: { name: "Guitarra 6C (E Standard)", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
    guitar_drop_d: { name: "Guitarra Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
    ukulele_std: { name: "Ukelele (GCEA)", notes: ["G4", "C4", "E4", "A4"] },
    bass_4: { name: "Bajo 4C (E Standard)", notes: ["E1", "A1", "D2", "G2"] },
    bass_5: { name: "Bajo 5C (B Standard)", notes: ["B0", "E1", "A1", "D2", "G2"] },
    violin_std: { name: "Violín (GDAE)", notes: ["G3", "D4", "A4", "E5"] },
};

export default function Tuner() {
    const [isListening, setIsListening] = useState(false);
    const [note, setNote] = useState("-");
    const [octave, setOctave] = useState(null);
    const [cents, setCents] = useState(0);
    const [frequency, setFrequency] = useState(0);
    const [selectedPreset, setSelectedPreset] = useState("guitar_std");

    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);

    const startTuner = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            setIsListening(true);
            updatePitch();
        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
            alert("No se pudo acceder al micrófono para el afinador.");
        }
    };

    const stopTuner = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (audioCtxRef.current) {
            if (audioCtxRef.current.state !== "closed") {
                audioCtxRef.current.close().catch(err => {
                    console.warn("AudioContext ya cerrado o en proceso de cierre:", err);
                });
            }
            audioCtxRef.current = null;
        }

        setIsListening(false);
        setNote("-");
        setOctave(null);
        setCents(0);
        setFrequency(0);
    };

    const autoCorrelate = (buffer, sampleRate) => {
        let SIZE = buffer.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            let val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);

        if (rms < 0.01) return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        SIZE = buffer.length;

        let c = new Array(SIZE).fill(0);
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE - i; j++) {
                c[i] = c[i] + buffer[j] * buffer[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    };

    const updatePitch = () => {
        if (!analyserRef.current || !audioCtxRef.current) return;

        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);

        const pitch = autoCorrelate(buffer, audioCtxRef.current.sampleRate);

        if (pitch !== -1) {
            const noteNum = 12 * (Math.log(pitch / 440) / Math.log(2)) + 69;
            const roundedNote = Math.round(noteNum);
            const detune = Math.floor((noteNum - roundedNote) * 100);

            const noteName = NOTE_NAMES[roundedNote % 12];
            const calculatedOctave = Math.floor(roundedNote / 12) - 1;

            setNote(noteName);
            setOctave(calculatedOctave);
            setCents(detune);
            setFrequency(Math.round(pitch));
        }

        animFrameRef.current = requestAnimationFrame(updatePitch);
    };

    useEffect(() => {
        return () => {
            stopTuner();
        };
    }, []);

    const isTargetInTune = isListening && Math.abs(cents) <= 5 && note !== "-";
    const currentPresetNotes = TUNING_PRESETS[selectedPreset]?.notes || [];

    return (
        <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-xl max-w-sm w-full mx-auto space-y-4 text-stone-900">
            {/* CABECERA */}
            <div className="flex justify-between items-center border-b border-stone-300/80 pb-3">
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-stone-600 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-amber-500 animate-pulse' : 'bg-stone-400'}`} />
                    Afinador Cromático
                </h3>
                <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-md">
                    {frequency > 0 ? `${frequency} Hz` : "440 Hz"}
                </span>
            </div>

            {/* SELECTOR DE PRESETS / PATRONES */}
            <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-stone-500 mb-1">
                    Patrón / Instrumento
                </label>
                <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full bg-stone-200/80 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                >
                    {Object.entries(TUNING_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                            {preset.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* CHIPS DE NOTAS OBJETIVO */}
            {currentPresetNotes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center py-1">
                    {currentPresetNotes.map((targetNote, idx) => {
                        const targetNoteName = targetNote.replace(/[0-9]/g, "");
                        const isCurrentNote = note === targetNoteName;
                        const isExactNoteInTune = isCurrentNote && isTargetInTune;

                        return (
                            <span
                                key={idx}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${isExactNoteInTune
                                        ? "bg-emerald-600 text-white border-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        : isCurrentNote
                                            ? "bg-amber-500 text-stone-900 border-amber-600"
                                            : "bg-stone-200/70 text-stone-600 border-stone-300"
                                    }`}
                            >
                                {targetNote}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* PANTALLA PRINCIPAL DE NOTA */}
            <div className="flex flex-col items-center justify-center py-4 bg-stone-200/50 rounded-xl border border-stone-300/60 relative overflow-hidden">
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-extrabold font-mono transition-colors duration-150 ${isTargetInTune ? "text-emerald-600" : "text-stone-800"}`}>
                        {note}
                    </span>
                    {octave !== null && note !== "-" && (
                        <span className="text-xl font-mono font-bold text-stone-500">
                            {octave}
                        </span>
                    )}
                </div>

                {/* AGUJA / MEDIDOR DE CENTS */}
                <div className="w-full px-6 mt-4 space-y-1">
                    <div className="relative w-full h-3 bg-stone-300/80 rounded-full overflow-hidden border border-stone-400/40">
                        {/* Marcador Central */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-stone-800 -translate-x-1/2 z-10" />

                        {/* Indicador de Desviación */}
                        {isListening && note !== "-" && (
                            <div
                                className={`absolute top-0 bottom-0 w-2.5 rounded-full transition-all duration-75 -translate-x-1/2 ${isTargetInTune ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-600"
                                    }`}
                                style={{
                                    left: `${Math.min(Math.max(((cents + 50) / 100) * 100, 5), 95)}%`
                                }}
                            />
                        )}
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-stone-500 font-semibold px-1">
                        <span>♭ -50</span>
                        <span className={isTargetInTune ? "text-emerald-700 font-bold" : ""}>
                            {isListening && note !== "-" ? `${cents > 0 ? '+' : ''}${cents} cents` : "0"}
                        </span>
                        <span>+50 ♯</span>
                    </div>
                </div>
            </div>

            {/* BOTÓN DE CONTROL */}
            <button
                type="button"
                onClick={isListening ? stopTuner : startTuner}
                className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer ${isListening
                        ? "bg-red-700 text-white hover:bg-red-800"
                        : "bg-[#383023] text-[#EAEAEA] hover:bg-[#252017]"
                    }`}
            >
                {isListening ? "Apagar Afinador" : "Encender Afinador"}
            </button>
        </div>
    );
}