import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from './config';
import SongSearch from "./SongSearch";
import SongForm from "./SongForm";

export default function SongEditor() {
  const { id } = useParams(); // Parámetro opcional /edit/:id

  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);
  const [savedSongs, setSavedSongs] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(id || null);

  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    window.location.href = '/';
  };

  const generarId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Cargar canción si viene id en la URL
  useEffect(() => {
    if (id) {
      setSelectedSongId(id);
      loadSong(id);
    }
  }, [id]);

  const updateSong = async () => {
    if (!selectedSongId) {
      alert("No hay ninguna canción seleccionada para actualizar.");
      return;
    }

    if (!tituloCancion.trim()) {
      alert("Por favor, ingresa el título de la canción antes de actualizar.");
      return;
    }

    const songData = {
      id: selectedSongId,
      title: tituloCancion,
      artist: artista,
      key_signature: tono,
      tempo: tempo,
      time_signature: secciones[0]?.compas || "4/4",
      song_data: {
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

  const deleteSong = async (songId) => {
    if (!songId) return;

    const confirmFirst = window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar "${tituloCancion || 'esta canción'}"?`);
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(`🔥 ¡ADVERTENCIA! Esta acción no se puede deshacer. ¿Realmente quieres borrar definitivamente la canción?`);
    if (!confirmSecond) return;

    const token = localStorage.getItem('easychart_token');

    try {
      const response = await fetch(`${API_URL}?id=${songId}`, {
        method: 'DELETE',
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al eliminar');
      }

      alert('Canción eliminada correctamente.');

      setSelectedSongId(null);
      setTituloCancion("");
      setArtista("");
      setSecciones([]);
      setSavedSongs(prev => prev.filter(s => s.id !== songId));
    } catch (error) {
      console.error('Error deleting song:', error);
      alert(`Error al eliminar la canción: ${error.message || 'Error de conexión'}`);
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

      const rawSongData = typeof song.song_data === 'string'
        ? JSON.parse(song.song_data)
        : song.song_data;

      setTituloCancion(song.title || "");
      setArtista(song.artist || rawSongData?.artist || "");
      setTono(song.key_signature || "C");
      setTempo(song.tempo || "120");
      setSemitono(0);
      setSelectedSongId(songId);

      const loadedSections = (rawSongData?.sections || rawSongData || []).map(section => ({
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
        })) || []
      }));

      setSecciones(loadedSections);
    } catch (error) {
      console.error('Error al cargar la canción:', error);
      alert('Error al cargar la canción');
    }
  };

  const handleSelectSong = (song) => {
    setSelectedSongId(song.id);
    loadSong(song.id);
  };

  return (
    <div className="app-container p-4 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md bg-opacity-95 border-b-2 border-[#1A1918]/10 shadow-md">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-[#2C2A29]/10">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                  {selectedSongId ? "EASYCHART EDITOR" : "EASYCHART SEARCH & EDIT"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center px-3.5 py-2 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-xl transition-all border border-[#D3CEBE] shadow-sm uppercase tracking-wider"
              >
                Volver
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center px-3.5 py-2 bg-[#EBE9E1] text-[#2C2A29] hover:bg-[#D3CEBE] active:bg-[#C2BCAB] font-mono font-semibold text-xs rounded-xl transition-all border border-[#D3CEBE] shadow-sm cursor-pointer uppercase tracking-wider"
              >
                Salir
              </button>
            </div>
          </div>

          {/* CAMPOS TÍTULO Y ARTISTA */}
          {selectedSongId && (
            <div className="space-y-1 py-1">
              <input
                type="text"
                value={tituloCancion}
                onChange={(e) => setTituloCancion(e.target.value)}
                className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none text-primary placeholder-[#5C5853]/50 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
                placeholder="Título de la canción"
                style={{ fontFamily: 'Architects Daughter, cursive' }}
              />
              <input
                type="text"
                value={artista}
                onChange={(e) => setArtista(e.target.value)}
                className="text-lg font-semibold w-full text-center bg-transparent focus:outline-none text-[#5C5853] placeholder-[#5C5853]/40 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
                placeholder="Autor o Artista"
                style={{ fontFamily: 'Architects Daughter, cursive' }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <SongForm
          tituloCancion={tituloCancion}
          setTituloCancion={setTituloCancion}
          artista={artista}
          setArtista={setArtista}
          tono={tono}
          setTono={setTono}
          tempo={tempo}
          setTempo={setTempo}
          semitono={semitono}
          setSemitono={setSemitono}
          secciones={secciones}
          setSecciones={setSecciones}
          onSaveOrUpdate={updateSong}
          saveButtonText="Actualizar Canción"
        >
          {/* BUSCADOR SONGSEARCH COMO HIJO DE SONGFORM */}
          <div className="bg-[#EAEAEA]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500">Búsqueda & Configuración</h2>
            <SongSearch onSelectSong={handleSelectSong} />
          </div>
        </SongForm>

        {/* ELIMINAR CANCIÓN (ZONA DE PELIGRO) */}
        {selectedSongId && (
          <div className="bg-red-50/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-red-200/80 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-red-900 font-sans uppercase">Zona de Peligro</h4>
              <p className="text-xs text-red-700 mt-0.5">Elimina permanentemente esta canción de la base de datos.</p>
            </div>
            <button
              onClick={() => deleteSong(selectedSongId)}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 font-mono text-xs tracking-wider uppercase font-bold rounded-xl transition shadow cursor-pointer active:scale-95"
            >
              🗑️ Eliminar Canción
            </button>
          </div>
        )}
      </div>
    </div>
  );
}