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
  const [phone, setPhone] = useState('');
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
        body: JSON.stringify({ phone, password }),
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
    <div className="relative min-h-screen bg-[#0A0A0B] text-amber-50 flex items-center justify-center p-4 overflow-hidden font-sans">

      {/* Fondo con imagen de escenario/estudio + Degradado a negro */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70 scale-105 filter blur-[2px]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1920&auto=format&fit=crop')`
        }}
      />

      {/* Viñeta oscura para enfocar el centro */}
      <div className="absolute inset-0 bg-radial-vignette bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-[#0A0A0B]/60" />

      {/* Contenedor Login estilo 'Rack' / Analógico */}
      <div className="relative w-full max-w-sm bg-white/90 border border-stone-800/80 rounded-xl p-7 shadow-2xl backdrop-blur-md">

        {/* Cabecera */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-stone-900/90 border border-amber-900/40 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-200/80">
              EASYCHART
            </span>
          </div>
          <h2 className="text-2xl font-black text-primary tracking-tight">
            Charts & Setlists
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Everything you need for rehearsals and live performances
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-xs text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1.5">
              Teléfono / Usuario
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 912 345 678"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#080809] border border-stone-800 text-sm font-mono text-amber-100 placeholder-stone-600 outline-none focus:border-amber-700/80 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#080809] border border-stone-800 text-sm font-mono text-amber-100 placeholder-stone-600 outline-none focus:border-amber-700/80 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-lg bg-stone-200 hover:bg-amber-100 text-stone-950 font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'CARGANDO REPERTORIO...' : 'ENTRAR AL REPERTORIO'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-800/60 text-center">
          <span className="text-[10px] font-mono text-stone-500 tracking-wider">
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
      {/* Ruta para crear canción nueva */}
      <Route path="/create" element={<SongCreator />} />

      {/* Ruta para editar una canción existente (debe incluir :id) */}
      <Route path="/edit/:id" element={<SongEditor />} />

      {/* Si quieres que /edit sin ID renderice el editor de búsqueda, asegúrate de indicarlo */}
      <Route path="/edit" element={<SongEditor />} />
      <Route path="/setlist" element={<SetList />} />
      <Route path="/setlist/edit" element={<SetListEdit />} />
    </Routes>
  );
}