import React, { useState, useEffect, useRef } from "react";

export default function Metronome() {
    const [bpm, setBpm] = useState(120);
    const [isPlaying, setIsPlaying] = useState(false);
    const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
    const [currentBeat, setCurrentBeat] = useState(0);

    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentBeatRef = useRef(0);
    const timerIdRef = useRef(null);

    // Sincronizar referencias editables en tiempo real
    const bpmRef = useRef(bpm);
    const beatsRef = useRef(beatsPerMeasure);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        beatsRef.current = beatsPerMeasure;
    }, [beatsPerMeasure]);

    // Reproduce un beep sintetizado (frecuencia alta para el primer pulso, media para los demás)
    const playClick = (time, beatNumber) => {
        if (!audioCtxRef.current) return;

        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        // Pulso 1 -> 1200Hz (Acento), Pulsos 2, 3, 4... -> 800Hz
        osc.frequency.value = beatNumber === 0 ? 1200 : 800;

        // Envolvente de volumen muy corta para sonido seco y preciso (Click)
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc.start(time);
        osc.stop(time + 0.05);
    };

    // Motor de planificación en segundo plano (Scheduler)
    const scheduler = () => {
        // Planificar clics que ocurran en los próximos 100ms
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            playClick(nextNoteTimeRef.current, currentBeatRef.current);

            // Programar la actualización del beat visual en la UI
            const beatToHighlight = currentBeatRef.current;
            const delay = Math.max(0, (nextNoteTimeRef.current - audioCtxRef.current.currentTime) * 1000);
            setTimeout(() => {
                setCurrentBeat(beatToHighlight);
            }, delay);

            // Calcular el tiempo del siguiente tiempo según el BPM
            const secondsPerBeat = 60.0 / bpmRef.current;
            nextNoteTimeRef.current += secondsPerBeat;

            // Avanzar el contador de tiempos (0, 1, 2, 3...)
            currentBeatRef.current = (currentBeatRef.current + 1) % beatsRef.current;
        }

        timerIdRef.current = setTimeout(scheduler, 25);
    };

    const startMetronome = () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }

        if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume();
        }

        currentBeatRef.current = 0;
        setCurrentBeat(0);
        nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;

        setIsPlaying(true);
        scheduler();
    };

    const stopMetronome = () => {
        if (timerIdRef.current) {
            clearTimeout(timerIdRef.current);
            timerIdRef.current = null;
        }

        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
            audioCtxRef.current.close().catch((err) => {
                console.warn("AudioContext metrónomo ya cerrado:", err);
            });
            audioCtxRef.current = null;
        }

        setIsPlaying(false);
        setCurrentBeat(0);
    };

    // Limpieza al desmontar el componente
    useEffect(() => {
        return () => {
            stopMetronome();
        };
    }, []);

    const handleBpmChange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            setBpm(Math.min(Math.max(val, 30), 300));
        }
    };

    return (
        <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-xl max-w-sm w-full mx-auto space-y-5 text-stone-900">
            {/* CABECERA */}
            <div className="flex justify-between items-center border-b border-stone-300/80 pb-3">
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-stone-600 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-amber-500 animate-pulse' : 'bg-stone-400'}`} />
                    Metrónomo Digital
                </h3>
                <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-md">
                    {beatsPerMeasure}/4
                </span>
            </div>

            {/* INDICADOR VISUAL DE PULSOS / COMPÁS */}
            <div className="flex justify-center items-center gap-2 py-2 bg-stone-200/50 rounded-xl border border-stone-300/60">
                {Array.from({ length: beatsPerMeasure }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-10 flex-1 mx-1 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all duration-75 ${isPlaying && currentBeat === index
                                ? index === 0
                                    ? "bg-amber-500 text-stone-900 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-105"
                                    : "bg-stone-800 text-white shadow-md scale-105"
                                : "bg-stone-300/80 text-stone-500"
                            }`}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>

            {/* DISPLAY DE BPM Y CONTROLES (-) (+) */}
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setBpm((prev) => Math.max(prev - 5, 30))}
                    className="w-12 h-12 rounded-xl bg-stone-200 border border-stone-300 text-stone-800 font-mono font-black text-lg hover:bg-stone-300 active:scale-95 transition cursor-pointer"
                >
                    -5
                </button>

                <div className="flex flex-col items-center">
                    <div className="text-4xl font-extrabold font-mono text-stone-800">
                        {bpm}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-500 tracking-wider">
                        BPM
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setBpm((prev) => Math.min(prev + 5, 300))}
                    className="w-12 h-12 rounded-xl bg-stone-200 border border-stone-300 text-stone-800 font-mono font-black text-lg hover:bg-stone-300 active:scale-95 transition cursor-pointer"
                >
                    +5
                </button>
            </div>

            {/* SLIDER DE AJUSTE RÁPIDO */}
            <div className="space-y-1">
                <input
                    type="range"
                    min="30"
                    max="300"
                    value={bpm}
                    onChange={handleBpmChange}
                    className="w-full accent-stone-800 cursor-pointer h-2 bg-stone-300 rounded-lg appearance-none"
                />
            </div>

            {/* SELECTOR DE COMPÁS */}
            <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                    Tiempos por compás
                </span>
                <div className="flex gap-1">
                    {[2, 3, 4, 6].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => setBeatsPerMeasure(num)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${beatsPerMeasure === num
                                    ? "bg-stone-800 text-white border-stone-900"
                                    : "bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300"
                                }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            {/* BOTÓN INICIAR / DETENER */}
            <button
                type="button"
                onClick={isPlaying ? stopMetronome : startMetronome}
                className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer ${isPlaying
                        ? "bg-red-700 text-white hover:bg-red-800"
                        : "bg-[#383023] text-[#EAEAEA] hover:bg-[#252017]"
                    }`}
            >
                {isPlaying ? "Detener Metrónomo" : "Iniciar Metrónomo"}
            </button>
        </div>
    );
}