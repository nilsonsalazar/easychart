import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SONGS_API_URL } from '../config';

export default function SetListEdit() {
  const [setlists, setSetlists] = useState([]);
  const [activeSetlistId, setActiveSetlistId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [catalogResults, setCatalogResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para editar el nombre del setlist
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentSetName, setCurrentSetName] = useState("");

  useEffect(() => {
    // Validación de roles: solo admin o editor
    const userRole = localStorage.getItem('easychart_role') || 'reader';
    const token = localStorage.getItem('easychart_token');

    if (!token || (userRole !== 'admin' && userRole !== 'editor')) {
      alert("Acceso denegado. Se requieren permisos de editor o administrador.");
      window.location.href = '/';
      return;
    }

    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const token = localStorage.getItem('easychart_token');
    try {
      const response = await fetch(SONGS_API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const loaded = data.setlists || [];
      setSetlists(loaded);

      if (loaded.length > 0) {
        const active = loaded.find(s => String(s.id) === String(activeSetlistId)) || loaded[0];
        setActiveSetlistId(active.id);
        setSongs(active.songs || []);
        setCurrentSetName(active.setlist_name);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
    }
  };

  const fetchCatalog = async (query) => {
    if (!query.trim()) {
      setCatalogResults([]);
      return;
    }
    const token = localStorage.getItem('easychart_token');
    try {
      const res = await fetch(`${SONGS_API_URL}?action=catalog&search=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCatalogResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al buscar en el catálogo:", err);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchCatalog(query);
  };

  const handleTabChange = (setlistId) => {
    setActiveSetlistId(setlistId);
    const found = setlists.find(s => String(s.id) === String(setlistId));
    setSongs(found ? found.songs || [] : []);
    setCurrentSetName(found ? found.setlist_name : "");
    setIsEditingName(false);
    setSearchQuery("");
    setCatalogResults([]);
  };

  const handleSaveSetName = async () => {
    if (!currentSetName.trim()) return;
    const token = localStorage.getItem('easychart_token');
    try {
      const res = await fetch(SONGS_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_setlist: activeSetlistId,
          setlist_name: currentSetName.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditingName(false);
        fetchInitialData();
      } else {
        alert(data.error || "Error al actualizar el nombre");
      }
    } catch (err) {
      alert("Error de conexión al actualizar el nombre");
    }
  };

  const handleClearSetlist = async () => {
    if (!window.confirm("¿Estás seguro de limpiar todas las canciones de este setlist?")) return;
    const token = localStorage.getItem('easychart_token');
    setLoading(true);
    try {
      const res = await fetch(`${SONGS_API_URL}?id_setlist=${activeSetlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSongs([]);
        fetchInitialData();
      }
    } catch (err) {
      alert("Error al limpiar el setlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSong = async (idSetListSong) => {
    const token = localStorage.getItem('easychart_token');
    try {
      const res = await fetch(`${SONGS_API_URL}?id_setlist=${activeSetlistId}&id_set_list_song=${idSetListSong}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSongs(songs.filter(s => (s.id_set_list_song || s.id) !== idSetListSong));
      }
    } catch (err) {
      alert("Error al eliminar la canción");
    }
  };

  const handleAddSongToSetlist = async (songId) => {
    const token = localStorage.getItem('easychart_token');
    try {
      const res = await fetch(SONGS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_setlist: activeSetlistId,
          id_song: songId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchInitialData();
      }
    } catch (err) {
      alert("Error al añadir la canción al setlist");
    }
  };

  return (
    <div className="app-container p-4 max-w-4xl mx-auto text-[#2C2A29]">
      <header className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#2C2A29]">
        <h1 className="text-xl font-bold font-mono uppercase">Editor de Setlist</h1>
        <Link to="/" className="px-3 py-1.5 bg-[#EBE9E1] border border-[#D3CEBE] rounded-lg font-mono text-xs font-semibold">
          Volver al Reader
        </Link>
      </header>

      {/* Tabs y Edición de Nombre */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {setlists.map(sl => (
            <button
              key={sl.id}
              onClick={() => handleTabChange(sl.id)}
              className={`px-4 py-2 font-mono text-xs font-bold rounded-lg border ${String(activeSetlistId) === String(sl.id)
                ? "bg-[#2C2A29] text-[#FAF9F5] border-[#2C2A29]"
                : "bg-[#EBE9E1] text-[#5C5853] border-[#D3CEBE]"
                }`}
            >
              {sl.setlist_name}
            </button>
          ))}
        </div>

        {/* Barra para editar el nombre del setlist activo */}
        <div className="flex items-center gap-2 bg-[#EBE9E1] p-3 rounded-xl border border-[#D3CEBE]">
          <span className="font-mono text-xs uppercase font-bold text-[#5C5853]">Playlist Activo:</span>
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={currentSetName}
                onChange={(e) => setCurrentSetName(e.target.value)}
                className="px-2 py-1 bg-[#FAF9F5] border border-[#D3CEBE] rounded text-xs font-mono flex-1 outline-none focus:border-[#2C2A29]"
              />
              <button
                onClick={handleSaveSetName}
                className="px-3 py-1 bg-[#2C2A29] text-[#FAF9F5] rounded font-mono text-xs font-bold"
              >
                Guardar
              </button>
              <button
                onClick={() => { setIsEditingName(false); fetchInitialData(); }}
                className="px-2 py-1 bg-[#D3CEBE] text-[#2C2A29] rounded font-mono text-xs"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-1">
              <span className="font-bold text-sm font-mono text-[#2C2A29]">{currentSetName}</span>
              <button
                onClick={() => setIsEditingName(true)}
                className="px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#F2F0EA] border border-[#D3CEBE] rounded font-mono text-xs text-[#2C2A29] transition"
              >
                Editar Nombre
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMNA 1: CANCIONES ACTUALES EN EL SETLIST */}
        <div className="bg-[#FAF9F5] border-2 border-[#2C2A29] rounded-xl p-4 shadow-md flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#D3CEBE]">
            <span className="font-mono text-xs uppercase font-bold text-[#5C5853]">
              En Setlist ({songs.length})
            </span>
            {songs.length > 0 && (
              <button
                onClick={handleClearSetlist}
                disabled={loading}
                className="px-2.5 py-1 bg-red-800 text-white font-mono text-[10px] rounded hover:bg-red-900 transition"
              >
                Limpiar Todo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {songs.length > 0 ? (
              songs.map((song, idx) => {
                const uniqueKey = song.id_set_list_song || `${song.id}-${idx}`;
                return (
                  <div key={uniqueKey} className="flex justify-between items-center p-2.5 bg-[#EBE9E1] rounded-lg border border-[#D3CEBE]">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs truncate">{idx + 1}. {song.title}</div>
                      <div className="text-[10px] text-[#5C5853] font-mono truncate">{song.artist || 'Sin artista'}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSong(song.id_set_list_song)}
                      className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded font-mono text-xs font-bold shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-12 font-mono text-xs text-[#8C867E]">Setlist vacío</p>
            )}
          </div>
        </div>

        {/* COLUMNA 2: BUSCADOR Y CATÁLOGO REMOTO EN TIEMPO REAL */}
        <div className="bg-[#FAF9F5] border-2 border-[#2C2A29] rounded-xl p-4 shadow-md flex flex-col h-[500px]">
          <div className="mb-4 pb-2 border-b border-[#D3CEBE]">
            <span className="font-mono text-xs uppercase font-bold text-[#5C5853] block mb-2">
              Añadir Canciones
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar por título o artista..."
              className="w-full px-3 py-2 rounded-lg bg-[#EBE9E1] border border-[#D3CEBE] text-xs font-mono outline-none focus:border-[#2C2A29]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {catalogResults.length > 0 ? (
              catalogResults.map((song) => (
                <div key={song.id} className="flex justify-between items-center p-2.5 bg-[#EBE9E1] rounded-lg border border-[#D3CEBE]">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs truncate">{song.title}</div>
                    <div className="text-[10px] text-[#5C5853] font-mono truncate">{song.artist || 'Sin artista'}</div>
                  </div>
                  <button
                    onClick={() => handleAddSongToSetlist(song.id)}
                    className="w-7 h-7 bg-[#2C2A29] text-[#D8B45A] hover:bg-[#1A1918] rounded-lg font-bold text-sm flex items-center justify-center shrink-0 shadow transition cursor-pointer"
                    title="Añadir al setlist"
                  >
                    +
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center py-12 font-mono text-xs text-[#8C867E]">
                {searchQuery.trim() ? "No se encontraron canciones" : "Escribe para buscar canciones..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}