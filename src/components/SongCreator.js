import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from './config';
import SongForm from "./SongForm";

export default function SongCreator() {
  const navigate = useNavigate();

  const [tono, setTono] = useState("C");
  const [tempo, setTempo] = useState("120");
  const [semitono, setSemitono] = useState(0);

  const [secciones, setSecciones] = useState([]);
  const [tituloCancion, setTituloCancion] = useState("");
  const [artista, setArtista] = useState("");

  const handleLogout = () => {
    localStorage.removeItem('easychart_token');
    window.location.href = '/';
  };

  const saveSong = async () => {
    if (!tituloCancion.trim()) {
      alert("Por favor, ingresa el título de la canción antes de guardar.");
      return;
    }

    if (secciones.length === 0) {
      alert("Agrega al menos una sección a la canción antes de guardarla.");
      return;
    }

    const newSong = {
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSong)
      });

      if (response.status === 401) {
        localStorage.removeItem('easychart_token');
        window.location.reload();
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al guardar');
      }

      alert('¡Canción guardada exitosamente!');

      if (result.id) {
        navigate(`/edit/${result.id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error saving song:', error);
      alert(`Error al guardar la canción: ${error.message || 'Error de conexión'}`);
    }
  };

  return (
    <div className="app-container p-4 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 app-card py-3 px-4 sm:px-6 mb-6 backdrop-blur-md bg-opacity-95 border-b-2 border-[#1A1918]/10 shadow-md">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-3 pb-3 border-b border-[#2C2A29]/10">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl border border-border shadow-inner flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-sm font-mono font-bold tracking-widest uppercase text-primary-foreground">
                  EASYCHART CREATOR
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
          <div className="space-y-1 py-1">
            <input
              type="text"
              value={tituloCancion}
              onChange={(e) => setTituloCancion(e.target.value)}
              className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none text-primary placeholder-[#5C5853]/50 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
              placeholder="Título de la canción..."
              style={{ fontFamily: 'Architects Daughter, cursive' }}
            />
            <input
              type="text"
              value={artista}
              onChange={(e) => setArtista(e.target.value)}
              className="text-lg font-semibold w-full text-center bg-transparent focus:outline-none text-[#5C5853] placeholder-[#5C5853]/40 border-b border-transparent focus:border-[#2C2A29]/20 transition-colors"
              placeholder="Autor o Artista..."
              style={{ fontFamily: 'Architects Daughter, cursive' }}
            />
          </div>
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
          onSaveOrUpdate={saveSong}
          saveButtonText="Guardar Canción"
        />
      </div>
    </div>
  );
}