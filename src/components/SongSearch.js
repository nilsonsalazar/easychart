// SongSearch.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { API_URL } from "./config";

const SongSearch = ({ onSelectSong, placeholder = "Search by artist or song..." }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [savedSongs, setSavedSongs] = useState([]);
    const [filteredSongs, setFilteredSongs] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Actualizar coordenadas del Portal para el dropdown
    const updateCoords = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Cargar catálogo inicial de canciones
    useEffect(() => {
        const fetchSongs = async () => {
            const token = localStorage.getItem("easychart_token");
            try {
                const response = await fetch(API_URL, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem("easychart_token");
                    window.location.reload();
                    return;
                }

                const data = await response.json();
                const songList = Array.isArray(data) ? data : data.data || [];

                if (response.ok) {
                    setSavedSongs(songList);
                }
            } catch (error) {
                console.error("Error al cargar canciones:", error);
            }
        };

        fetchSongs();
    }, []);

    // Event Listener para cerrar dropdown al hacer clic fuera o al redimensionar/scrollear
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                inputRef.current && !inputRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("resize", updateCoords);
        window.addEventListener("scroll", updateCoords, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("resize", updateCoords);
            window.removeEventListener("scroll", updateCoords, true);
        };
    }, []);

    // Búsqueda remota vía API
    const searchSongsApi = async (term) => {
        const token = localStorage.getItem("easychart_token");
        try {
            const response = await fetch(`${API_URL}?search=${encodeURIComponent(term)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem("easychart_token");
                window.location.reload();
                return [];
            }

            if (!response.ok) throw new Error("Error en la búsqueda");

            const resData = await response.json();
            const data = resData.data || resData;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Error buscando canciones:", error);
            return [];
        }
    };

    // Manejador del input de búsqueda
    const handleSearch = async (term) => {
        setSearchTerm(term);
        updateCoords();

        if (!term.trim()) {
            setFilteredSongs([]);
            setShowDropdown(false);
            return;
        }

        if (term.length < 5) {
            const normalize = (str) =>
                str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            const words = normalize(term).split(/\s+/).filter(Boolean);

            const localResults = savedSongs.filter((song) => {
                const title = normalize(song.title || "");
                const artist = normalize(song.artist || "");
                const target = `${title} ${artist}`;

                return words.every((word) => target.includes(word));
            });

            setFilteredSongs(localResults);
            setShowDropdown(localResults.length > 0);
            return;
        }

        const results = await searchSongsApi(term);
        setFilteredSongs(results);
        setShowDropdown(results.length > 0);
    };

    const handleSelect = (song) => {
        setSearchTerm(song.title);
        setShowDropdown(false);
        if (onSelectSong) {
            onSelectSong(song);
        }
    };

    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C867E]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                    updateCoords();
                    if (filteredSongs.length > 0) setShowDropdown(true);
                }}
                placeholder={placeholder}
                className="app-input w-full pl-10 pr-4"
            />

            {/* PORTAL PARA EL DROPDOWN */}
            {showDropdown && filteredSongs.length > 0 && ReactDOM.createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: "absolute",
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        zIndex: 99999
                    }}
                    className="bg-[#FAF9F5] border-2 border-[#2C2A29] rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-[#D3CEBE]"
                >
                    {filteredSongs.map((song) => (
                        <div
                            key={song.id}
                            className="p-3.5 hover:bg-[#F2F0EA] transition-colors cursor-pointer flex justify-between items-center text-left"
                            onClick={() => handleSelect(song)}
                        >
                            <div>
                                <div className="font-semibold text-[#2C2A29]">{song.title}</div>
                                <div className="text-xs text-[#5C5853] mt-0.5">
                                    {song.artist || song.song_data?.artist ? `Artista: ${song.artist || song.song_data?.artist} • ` : ""}
                                    Tonalidad: {song.key_signature}
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-[#EBE9E1] text-[#2C2A29] border border-[#D3CEBE] rounded-lg">
                                {song.tempo} BPM
                            </span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default SongSearch;