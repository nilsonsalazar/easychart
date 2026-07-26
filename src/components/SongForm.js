import React, { useState } from "react";
import circulos, { relativasMenores } from "./circulos";
import { PDFDownloadLink } from "@react-pdf/renderer";
import SongPDF from "./SongPDF";
import MusicKeyboard from "./MusicKeyboard";

export default function SongForm({
    tituloCancion,
    setTituloCancion,
    artista,
    setArtista,
    tono,
    setTono,
    tempo,
    setTempo,
    semitono,
    setSemitono,
    secciones,
    setSecciones,
    onSaveOrUpdate,
    saveButtonText = "Guardar Canción",
    children
}) {
    const [modalData, setModalData] = useState(null);
    const [showToneMenu, setShowToneMenu] = useState(false);
    const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
    const [editingSeccionId, setEditingSeccionId] = useState(null);
    const [showPDFOptions, setShowPDFOptions] = useState(false);

    const tonos = [
        "C", "Am", "D♭", "B♭m", "D", "Bm", "E♭", "Cm",
        "E", "C#m", "F", "Dm", "G♭", "E♭m", "G", "Em",
        "A♭", "Fm", "A", "F#m", "B♭", "Gm", "B", "G#m"
    ];

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

    const getAcordesDisponibles = () => {
        const claveCirculo = relativasMenores?.[tono] || tono;
        const tonoActual = circulos[claveCirculo];
        if (!tonoActual) return [];
        return tonoActual.degrees.flatMap(degree => degree.common_extensions);
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
                    compasses: Array.from({ length: 4 }, () => ({
                        id: generarId("compass"),
                        divisiones: 1,
                        acordes: Array(1).fill("").map(() => ({
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
                            compasses: Array.from({ length: 4 }, () => ({
                                id: generarId("compass"),
                                divisiones: 1,
                                acordes: Array(1).fill("").map(() => ({
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
        <div className="space-y-6">
            {/* SLOT PARA COMPONENTES ADICIONALES (EJ: SongSearch en SongEditor) */}
            {children}

            {/* CONFIGURACIÓN Y PARÁMETROS */}
            <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-6 space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500">Configuración Parámetros</h2>

                <div className="space-y-4 pt-2">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-stone-500">
                                Tonalidad Directa
                            </label>
                            <span className="text-xs font-mono font-bold text-[#383023] bg-stone-300/60 px-3 py-1 rounded-full border border-stone-300">
                                Tono Actual: {tono} {semitono !== 0 ? `(${semitono > 0 ? '+' : ''}${semitono} st)` : ''}
                            </span>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowToneMenu(!showToneMenu)}
                                className="flex items-center justify-between w-full sm:w-64 px-4 py-2.5 rounded-xl bg-[#383023] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase font-semibold shadow hover:bg-[#252017] transition"
                            >
                                <span>🎵 Tono: {tono}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`w-4 h-4 transition-transform ${showToneMenu ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showToneMenu && (
                                <div className="absolute z-50 mt-2 w-full sm:w-72 rounded-xl border border-stone-300 bg-[#EAEAEA] shadow-2xl p-3">
                                    <p className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">
                                        Selecciona tonalidad
                                    </p>
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
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest text-stone-500 mb-1">Tempo (BPM)</label>
                            <input
                                type="number"
                                value={tempo}
                                onChange={(e) => setTempo(e.target.value)}
                                placeholder="Tempo"
                                min="0"
                                max="360"
                                step="1"
                                className="w-28 rounded-xl border border-stone-300/80 bg-[#E2E8F0]/70 py-2 px-3 text-sm font-semibold text-stone-800 focus:outline-none focus:border-stone-500"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => ajustarSemitono(-1)}
                                className="px-4 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                            >
                                ♭ -1 Semitono
                            </button>

                            <button
                                type="button"
                                onClick={() => ajustarSemitono(1)}
                                className="px-4 py-2 bg-stone-200/80 border border-stone-300 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs font-mono transition active:scale-95"
                            >
                                ♯ +1 Semitono
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-300/60">
                        <button
                            onClick={onSaveOrUpdate}
                            className="flex items-center px-4 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#D8B45A]" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                            </svg>
                            {saveButtonText}
                        </button>

                        <button
                            onClick={() => {
                                if (!tituloCancion.trim()) {
                                    alert("Por favor, ingresa el título de la canción para exportar a PDF.");
                                    return;
                                }
                                setShowPDFOptions(!showPDFOptions);
                            }}
                            className="flex items-center px-4 py-2.5 bg-stone-200 border border-stone-300 text-stone-800 hover:bg-stone-300 font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-stone-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {showPDFOptions ? 'Ocultar PDF' : 'Exportar a PDF'}
                        </button>
                    </div>

                    {showPDFOptions && (
                        <div className="mt-4 p-4 border border-stone-300/80 rounded-xl bg-stone-200/50">
                            <PDFDownloadLink
                                document={<SongPDF title={tituloCancion} artist={artista} sections={secciones} keySignature={tono} tempo={tempo} />}
                                fileName={`${(tituloCancion || 'cancion').replace(/\s+/g, '_')}.pdf`}
                                className="block w-full text-center px-4 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-medium rounded-xl transition shadow cursor-pointer"
                            >
                                {({ loading, error }) => (
                                    loading ? 'Preparando PDF...' : error ? 'Error al generar PDF' : 'Descargar PDF ahora'
                                )}
                            </PDFDownloadLink>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIONES DE LA CANCIÓN */}
            {secciones.map((sec) => (
                <div key={sec.id} className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 text-stone-900">
                    <div className="flex justify-between items-center p-4 border-b border-stone-300/80 bg-stone-200/50">
                        {editingSeccionId === sec.id ? (
                            <input
                                type="text"
                                defaultValue={sec.nombre}
                                onBlur={(e) => editarNombreSeccion(sec.id, e.target.value)}
                                autoFocus
                                className="px-3 py-1 bg-white border border-stone-400 rounded text-stone-900 font-bold"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-stone-800 text-base uppercase tracking-wider font-sans">
                                    {sec.nombre}
                                </h3>
                                <button
                                    onClick={() => setEditingSeccionId(sec.id)}
                                    className="text-stone-400 hover:text-stone-700 transition"
                                >
                                    ✏️
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => eliminarSeccion(sec.id)}
                            className="text-xs font-mono uppercase tracking-wider text-red-700 hover:text-red-900 px-3 py-1 bg-red-100/60 rounded-lg border border-red-200/60 transition"
                        >
                            Eliminar Sección
                        </button>
                    </div>

                    <div className="p-6 space-y-6" style={{ fontFamily: 'Architects Daughter, cursive' }}>
                        {sec.lineas.map((linea, lIdx) => (
                            <div key={linea.id} className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleRepetirLinea(sec.id, lIdx)}
                                    className={`px-2 py-1 rounded text-xs font-sans transition ${linea.repetir ? 'bg-[#383023] text-[#D8B45A]' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'}`}
                                >
                                    {linea.repetir ? ':||' : '||'}
                                </button>

                                <div className="flex justify-evenly gap-2 flex-1">
                                    {linea.compasses.map((compass, cIdx) => (
                                        <div key={compass.id} className="relative w-1/4 border-l border-r border-stone-800 px-2 py-2 bg-stone-100/40 rounded-sm">
                                            <div className="flex justify-between items-center mb-1 font-sans">
                                                <span className="text-[10px] text-stone-500 font-mono">
                                                    C{cIdx + 1}
                                                </span>
                                                <select
                                                    value={compass.divisiones}
                                                    onChange={(e) => cambiarDivisiones(sec.id, lIdx, cIdx, parseInt(e.target.value))}
                                                    className="text-[10px] bg-transparent border-none text-stone-600 font-mono focus:outline-none"
                                                >
                                                    <option value={1}>1 div</option>
                                                    <option value={2}>2 div</option>
                                                    <option value={4}>4 div</option>
                                                </select>
                                            </div>

                                            <div
                                                className="grid gap-1 text-center"
                                                style={{
                                                    gridTemplateColumns: `repeat(${compass.divisiones}, minmax(0, 1fr))`
                                                }}
                                            >
                                                {compass.acordes.map((acorde, dIdx) => (
                                                    <button
                                                        key={acorde.id}
                                                        onClick={() => setModalData({ seccionId: sec.id, lineaIndex: lIdx, compasIndex: cIdx, divisionIndex: dIdx })}
                                                        className="py-1 text-xl font-extrabold text-stone-900 hover:bg-stone-200 rounded transition border border-dashed border-stone-300 hover:border-stone-500"
                                                    >
                                                        {acorde.valor || "-"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => agregarLinea(sec.id)}
                            className="w-full py-2 bg-stone-200/60 border border-dashed border-stone-400 text-stone-700 hover:bg-stone-200 rounded-xl font-sans text-xs uppercase font-semibold transition"
                        >
                            + Agregar Línea
                        </button>
                    </div>
                </div>
            ))}

            {/* AGREGAR NUEVA SECCIÓN */}
            <div className="bg-[#EAEAEA]/90 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/40 flex gap-3">
                <input
                    type="text"
                    value={nuevaSeccionNombre}
                    onChange={(e) => setNuevaSeccionNombre(e.target.value)}
                    placeholder="Nombre de nueva sección..."
                    className="flex-1 px-4 py-2.5 bg-[#E2E8F0]/70 border border-stone-300/80 rounded-xl focus:outline-none focus:border-stone-500 text-stone-800 placeholder-stone-400 font-sans text-sm"
                />
                <button
                    onClick={agregarSeccion}
                    className="px-5 py-2.5 bg-[#383023] text-[#EAEAEA] hover:bg-[#252017] font-mono text-xs tracking-wider uppercase font-semibold rounded-xl transition shadow"
                >
                    + Nueva Sección
                </button>
            </div>

            {/* MODAL SELECCIÓN DE ACORDES */}
            {modalData && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#EAEAEA] rounded-2xl shadow-2xl border border-white/50 p-6 max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-300 pb-2">
                            <h4 className="font-bold text-stone-800 text-sm font-sans uppercase">Seleccionar Acorde ({tono})</h4>
                            <button
                                onClick={() => setModalData(null)}
                                className="text-stone-500 hover:text-stone-800 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                            <button
                                onClick={() => handleAcordeChange(modalData.seccionId, modalData.lineaIndex, modalData.compasIndex, modalData.divisionIndex, "")}
                                className="py-2 bg-stone-300/60 hover:bg-stone-300 text-stone-700 rounded-lg font-bold text-xs font-mono"
                            >
                                Limpiar (-)
                            </button>
                            {getAcordesDisponibles().map((acorde, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAcordeChange(modalData.seccionId, modalData.lineaIndex, modalData.compasIndex, modalData.divisionIndex, acorde)}
                                    className="py-2 bg-stone-200 hover:bg-[#383023] hover:text-[#D8B45A] text-stone-800 rounded-lg font-bold text-xs font-mono transition"
                                >
                                    {acorde}
                                </button>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-stone-300 space-y-2">
                            <label className="block text-xs font-mono uppercase tracking-widest text-stone-500">
                                Acorde Personalizado
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="customChordInput"
                                    className="flex-1 px-3 py-2 bg-stone-100 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-500 text-stone-800 placeholder-stone-400 font-sans text-sm font-semibold"
                                    placeholder="Ej: C#m7, G7sus4..."
                                    onClick={(e) => {
                                        const keyboard = document.getElementById('musicKeyboard');
                                        if (keyboard) keyboard.classList.remove('hidden');
                                        e.stopPropagation();
                                    }}
                                />
                                <button
                                    className="px-4 py-2 bg-[#383023] hover:bg-[#252017] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase font-semibold rounded-xl transition shadow cursor-pointer"
                                    onClick={() => {
                                        const input = document.getElementById('customChordInput');
                                        if (input && input.value.trim()) {
                                            handleAcordeChange(
                                                modalData.seccionId,
                                                modalData.lineaIndex,
                                                modalData.compasIndex,
                                                modalData.divisionIndex,
                                                input.value.trim()
                                            );
                                        }
                                    }}
                                >
                                    Usar
                                </button>
                            </div>

                            <div id="musicKeyboard" className="hidden pt-1 w-full">
                                <MusicKeyboard
                                    onKeyPress={(char) => {
                                        const input = document.getElementById('customChordInput');
                                        if (input) {
                                            input.value = (input.value || '') + char;
                                            input.focus();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}