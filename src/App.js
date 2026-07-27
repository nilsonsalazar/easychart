import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import SongReader from "./components/SongReader";
import SongCreator from "./components/SongCreator";
import SongEditor from "./components/SongEditor";
import SetList from "./components/SetList";
import SetListEdit from "./components/SetListEdit";

// Componente para manejar el inicio de sesión
const userRole = localStorage.getItem('easychart_role') || 'reader';
// Componente Login - Estética Vintage/Live Stage (Hendrix / Floyd / Live Gospel)
function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://visual777.pt/easychart/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Error de autenticación');
      }

      const token = resData.data.token;
      const role = resData.data.role; // Asegúrate de que el backend devuelva el rol en la respuesta
      localStorage.setItem('easychart_token', token);
      localStorage.setItem('easychart_role', role);
      onLoginSuccess(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0B] text-stone-900 flex items-center justify-center p-4 overflow-hidden font-sans">

      {/* Fondo con imagen de escenario/estudio */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-85 scale-105 filter blur-[0.3px]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1920&auto=format&fit=crop')`
        }}
      />

      {/* Viñeta oscura más ligera para permitir que luzca la foto de fondo */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B]/80 via-[#0A0A0B]/40 to-transparent" />

      {/* Contenedor Login estilo 'Rack' / Analógico optimizado para dispositivos móviles */}
      <div className="relative w-full max-w-sm bg-white/95 border border-stone-300/80 rounded-xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">

        {/* Cabecera con textos suavizados (stone-700 / stone-600) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-stone-900 border border-amber-900/40 mb-3 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-amber-200 font-semibold">
              EASYCHART
            </span>
          </div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">
            Charts & Setlists
          </h2>
          <p className="text-sm font-medium text-stone-600 mt-1.5 px-2">
            Everything you need for rehearsals and live performances
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-950/40 border border-red-800/50 text-red-200 text-xs text-center font-mono font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-stone-600 mb-1.5 font-bold">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="+351 912 345 678"
              required
              className="w-full px-3.5 py-3 rounded-lg bg-[#080809] border border-stone-800 text-sm font-mono text-amber-100 placeholder-stone-500 outline-none focus:border-amber-700/80 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-stone-600 mb-1.5 font-bold">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-3 rounded-lg bg-[#080809] border border-stone-800 text-sm font-mono text-amber-100 placeholder-stone-500 outline-none focus:border-amber-700/80 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Loading Repertoire Book...' : 'Acces to Repertoire Book'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-300 text-center">
          <span className="text-xs font-mono text-stone-500 font-semibold tracking-wider">
            LIVE BAND SYSTEM • V 1.0
          </span>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('easychart_token'));

  // Si no hay token guardado, mostramos el formulario de login
  if (!token) {
    return <Login onLoginSuccess={(newToken) => setToken(newToken)} />;
  }

  // Si hay token, cargamos tus rutas habituales exactamente como las tenías
  return (
    <Routes>
      {/* Ruta por defecto: modo lectura */}
      <Route path="/" element={<SongReader />} />

      {/* Ruta para crear o editar canciones */}
      <Route path="/create" element={<SongCreator />} />

      {/* Ruta para editar una canción existente (debe incluir :id) */}
      <Route path="/edit/:id" element={<SongEditor />} />

      <Route path="/edit" element={<SongEditor />} />
      <Route path="/setlist" element={<SetList />} />
      <Route path="/setlist/edit" element={<SetListEdit />} />
    </Routes>
  );
}