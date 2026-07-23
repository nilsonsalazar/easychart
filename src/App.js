import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import SongReader from "./components/SongReader";
import SongCreator from "./components/SongCreator";

// Componente para manejar el inicio de sesión
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Error de autenticación');
      }

      // Extraemos el token desde resData.data
      const token = resData.data.token;

      // Guardar en localStorage
      localStorage.setItem('easychart_token', token);

      // Actualizar el estado para mostrar las rutas de la app
      onLoginSuccess(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '360px', margin: '80px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>EasyChart - Login</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Teléfono:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Entrando...' : 'Iniciar Sesión'}
        </button>
      </form>
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
      <Route path="/crear" element={<SongCreator />} />
    </Routes>
  );
}