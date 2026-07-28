import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const SongLyricsPageEdit = () => {
    const { songId } = useParams();
    const navigate = useNavigate();

    const [lyricsData, setLyricsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para el modo de edición y formulario basado en secciones dinámicas personalizadas
    const [isEditing, setIsEditing] = useState(false);
    const [sections, setSections] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    useEffect(() => {
        const fetchSongLyrics = async () => {
            if (!songId) {
                setError("Error 001");
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('easychart_token');
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
                const rawLyrics = data.song?.lyrics || "";

                // Parsear a estructura de secciones JSON si es posible
                let parsedSections = [];
                if (typeof rawLyrics === 'string' && rawLyrics.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(rawLyrics);
                        parsedSections = parsed?.sections || parsed?.lyrics?.sections || [];
                    } catch (e) {
                        parsedSections = [];
                    }
                }

                // Si viene como texto plano antiguo o está vacío, lo dejamos vacío para que el usuario construya libremente
                if (parsedSections.length === 0 && rawLyrics.trim() !== "") {
                    parsedSections = [
                        { id: Date.now(), label: "verso1", content: rawLyrics }
                    ];
                }

                setSections(parsedSections);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSongLyrics();
    }, [songId]);

    // Agregar nueva sección con nombre libre por parte del usuario
    const handleAddSection = () => {
        setSections(prev => [
            ...prev,
            { id: Date.now() + Math.random(), label: "", content: "" }
        ]);
    };

    const handleRemoveSection = (index) => {
        setSections(prev => prev.filter((_, i) => i !== index));
    };

    const handleSectionChange = (index, field, value) => {
        setSections(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Serializar a JSON estricto y enviar a la BD vía PUT
    const handleSaveLyrics = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage(null);

        try {
            const token = localStorage.getItem('easychart_token');

            const jsonPayload = JSON.stringify({
                sections: sections.map(s => ({
                    label: s.label.trim(),
                    content: s.content
                }))
            });

            const response = await fetch(`https://visual777.pt/easychart/song/song.php?action=updatelyric`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    id: songId,
                    lyrics: jsonPayload
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo actualizar la letra');
            }

            setLyricsData(prev => ({ ...prev, lyrics: jsonPayload }));
            setIsEditing(false);
            setSaveMessage("Estructura de secciones guardada en JSON correctamente");
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Procesamiento visualizador en modo lectura
    const rawContent = lyricsData?.lyrics || "";
    let displaySections = [];

    if (typeof rawContent === 'string' && rawContent.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(rawContent);
            displaySections = parsed?.sections || parsed?.lyrics?.sections || [];
        } catch (e) {
            displaySections = [{ label: "General", content: rawContent }];
        }
    } else if (rawContent.trim() !== "") {
        displaySections = [{ label: "General", content: rawContent }];
    }

    const displayTitle = lyricsData?.title || "Lyric Editor";
    const displayArtist = lyricsData?.artist || "Author";

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-stone-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-[#FAF9F5] border-2 border-[#2C2A29] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Page Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2C2A29] bg-[#E8E5DC]">
                    <div>
                        <h3 className="text-lg font-black text-[#2C2A29] uppercase tracking-wide">
                            {displayTitle}
                        </h3>
                        <p className="text-xs font-mono font-semibold text-[#5C5853]">
                            {displayArtist}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!loading && !error && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/songreader/${songId}`)}
                                    className="px-3 py-1.5 rounded-xl bg-[#2C2A29] text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition cursor-pointer"
                                    title="Ir al Reader con esta canción"
                                >
                                    Ver Reader
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="px-3 py-1.5 rounded-xl bg-[#2C2A29] text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition cursor-pointer"
                                >
                                    {isEditing ? "Ver Vista" : "Edit Sections"}
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-xl bg-[#2C2A29] text-[#FAF9F5] flex items-center justify-center font-bold hover:bg-stone-800 transition cursor-pointer"
                            title="Back"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Page Body / Content */}
                <div className="p-6 overflow-y-auto space-y-6 font-sans">
                    {loading ? (
                        <div className="text-center text-stone-600 font-mono text-sm py-12">
                            Cargando letra de la API...
                        </div>
                    ) : error ? (
                        <div className="p-3 rounded bg-red-950/20 border border-red-800/40 text-red-700 text-xs text-center font-mono font-medium">
                            {error}
                        </div>
                    ) : saveMessage ? (
                        <div className="p-3 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-700 text-xs text-center font-mono font-medium">
                            {saveMessage}
                        </div>
                    ) : null}

                    {!loading && isEditing ? (
                        <form onSubmit={handleSaveLyrics} className="space-y-6">

                            {/* Botón superior para agregar secciones con nombre libre */}
                            <div className="flex items-center justify-between bg-[#EBE9E1] p-3.5 rounded-xl border border-[#D3CEBE]">
                                <span className="text-xs font-mono font-bold uppercase text-stone-700">
                                    Constructor de Secciones:
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddSection}
                                    className="px-4 py-2 bg-[#2C2A29] text-[#FAF9F5] rounded-xl font-mono text-xs font-bold hover:bg-stone-800 transition cursor-pointer shadow-sm"
                                >
                                    + Agregar Sección
                                </button>
                            </div>

                            {/* Contenedor de Secciones Distintas con Estructura Clara */}
                            <div className="space-y-4">
                                {sections.map((sec, index) => (
                                    <div key={sec.id || index} className="p-4 rounded-xl border-2 border-[#2C2A29] bg-white space-y-3 shadow-md relative">

                                        {/* Barra de cabecera de la sección individual */}
                                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-stone-200">
                                            <div className="flex items-center space-x-2 flex-1">
                                                <span className="text-xs font-mono font-extrabold uppercase text-stone-500">
                                                    Sección {index + 1}:
                                                </span>
                                                <input
                                                    type="text"
                                                    value={sec.label}
                                                    onChange={(e) => handleSectionChange(index, 'label', e.target.value)}
                                                    placeholder="Ej: verso1, coro x, puente1..."
                                                    className="flex-1 p-2 rounded-lg border border-[#D3CEBE] font-mono text-xs bg-[#FAF9F5] text-[#2C2A29] font-bold focus:outline-none focus:ring-1 focus:ring-[#2C2A29]"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSection(index)}
                                                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-mono text-xs font-bold transition cursor-pointer"
                                                title="Eliminar esta sección"
                                            >
                                                Eliminar
                                            </button>
                                        </div>

                                        {/* Campo de texto libre para las líneas de la sección (1 hasta n líneas) */}
                                        <div>
                                            <label className="block text-[11px] font-mono text-stone-500 mb-1">
                                                Líneas de la sección (puedes escribir múltiples líneas con Enter):
                                            </label>
                                            <textarea
                                                value={sec.content}
                                                onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                                                rows={4}
                                                placeholder="Escribe la letra línea por línea..."
                                                className="w-full p-3 rounded-lg border border-[#D3CEBE] bg-[#FAF9F5]/50 font-mono text-sm text-[#2C2A29] focus:outline-none focus:ring-1 focus:ring-[#2C2A29]"
                                            />
                                        </div>
                                    </div>
                                ))}

                                {sections.length === 0 && (
                                    <div className="text-center py-10 text-stone-500 font-mono text-xs border-2 border-dashed border-stone-300 rounded-xl bg-white/40">
                                        No hay secciones creadas. Haz clic en <strong>"+ Agregar Sección"</strong> para comenzar.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-[#2C2A29] hover:bg-stone-800 text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    {saving ? "Guardando JSON..." : "Guardar en BD (JSON)"}
                                </button>
                            </div>
                        </form>
                    ) : !loading && !error ? (
                        displaySections.length > 0 ? (
                            <div className="space-y-4">
                                {displaySections.map((sec, idx) => (
                                    <div key={idx} className="bg-white/80 p-4 rounded-xl border border-[#D3CEBE] shadow-sm space-y-1.5">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#2C2A29] text-[#FAF9F5] font-mono text-[10px] font-bold uppercase tracking-wider">
                                            {sec.label || "Sección"}
                                        </span>
                                        <p className="text-[#2C2A29] text-sm md:text-base font-medium whitespace-pre-line leading-relaxed pt-1">
                                            {sec.content || ""}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-stone-500 font-mono text-sm py-8">
                                No hay secciones registradas. Haz clic en "Edit Sections" para crearlas libremente.
                            </p>
                        )
                    ) : null}
                </div>

                {/* Page Footer */}
                <div className="px-6 py-3 border-t border-[#D3CEBE] bg-[#EBE9E1] flex justify-between items-center">
                    {!loading && !error && (
                        <button
                            type="button"
                            onClick={() => navigate(`/songreader/${songId}`)}
                            className="px-4 py-2 bg-[#2C2A29] hover:bg-stone-800 text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
                        >
                            Ver en Reader
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-5 py-2 bg-[#2C2A29] hover:bg-stone-800 text-[#FAF9F5] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm ml-auto"
                    >
                        Volver
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SongLyricsPageEdit;