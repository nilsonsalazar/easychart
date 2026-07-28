import React, { useState, useEffect } from "react";

const ShowLyrics = ({ isOpen, songId, songTitle: initialTitle, artist: initialArtist, onClose }) => {
    const [lyricsData, setLyricsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Si el modal se abre y tenemos un songId, hacemos la petición a la API
        if (isOpen && songId) {
            const fetchSongLyrics = async () => {
                setLoading(true);
                setError(null);
                try {
                    const token = localStorage.getItem('easychart_token');
                    // Ajusta la URL base según corresponda en tu entorno
                    const response = await fetch(`https://visual777.pt/easychart/song/song.php?action=lyrics&id=${songId}`, {
                        headers: {
                            'Authorization': token ? `Bearer ${token}` : ''
                        }
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.error || 'No se pudo cargar la letra');
                    }

                    setLyricsData(data.song);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            fetchSongLyrics();
        } else {
            // Limpiamos al cerrar
            setLyricsData(null);
            setError(null);
        }
    }, [isOpen, songId]);

    if (!isOpen) return null;

    // Extraer y parsear las letras obtenidas de la base de datos
    const rawLyrics = lyricsData?.lyrics || "";
    let parsedLyrics = rawLyrics;

    if (typeof rawLyrics === 'string' && rawLyrics.trim() !== '') {
        try {
            parsedLyrics = JSON.parse(rawLyrics);
        } catch (e) {
            parsedLyrics = { raw: rawLyrics };
        }
    }

    const sections =
        parsedLyrics?.sections ||
        parsedLyrics?.lyrics?.sections ||
        [];

    const rawContent = typeof parsedLyrics === 'string' ? parsedLyrics : parsedLyrics?.raw;

    // Título y artista finales (priorizando los devueltos por la API si existen)
    const displayTitle = lyricsData?.title || initialTitle || "Letra de Canción";
    const displayArtist = lyricsData?.artist || initialArtist || "Artista";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#FAF9F5] border-2 border-[#2C2A29] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2C2A29] bg-[#E8E5DC]">
                    <div>
                        <h3 className="text-lg font-black text-[#2C2A29] uppercase tracking-wide">
                            {displayTitle}
                        </h3>
                        <p className="text-xs font-mono font-semibold text-[#5C5853]">
                            {displayArtist}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-[#2C2A29] text-[#FAF9F5] flex items-center justify-center font-bold hover:bg-stone-800 transition cursor-pointer"
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body / Content */}
                <div className="p-6 overflow-y-auto space-y-6 font-sans">
                    {loading ? (
                        <div className="text-center text-stone-600 font-mono text-sm py-12">
                            Cargando letra...
                        </div>
                    ) : error ? (
                        <div className="p-3 rounded bg-red-950/20 border border-red-800/40 text-red-700 text-xs text-center font-mono font-medium">
                            {error}
                        </div>
                    ) : sections.length > 0 ? (
                        sections.map((section, idx) => (
                            <div key={idx} className="bg-white/60 p-4 rounded-xl border border-[#D3CEBE] shadow-sm">
                                <span className="inline-block text-[11px] font-mono font-extrabold uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md mb-2">
                                    {section.label || section.type || `Sección ${idx + 1}`}
                                </span>
                                <p className="text-[#2C2A29] text-sm md:text-base font-medium whitespace-pre-line leading-relaxed">
                                    {section.content || section.text || ""}
                                </p>
                            </div>
                        ))
                    ) : rawContent ? (
                        <div className="bg-white/60 p-4 rounded-xl border border-[#D3CEBE] shadow-sm">
                            <p className="text-[#2C2A29] text-sm md:text-base font-medium whitespace-pre-line leading-relaxed">
                                {rawContent}
                            </p>
                        </div>
                    ) : (
                        <p className="text-center text-stone-500 font-mono text-sm py-8">
                            No hay letra disponible para esta canción.
                        </p>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-[#D3CEBE] bg-[#EBE9E1] text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-[#2C2A29] hover:bg-stone-800 text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ShowLyrics;