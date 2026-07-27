import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SongReader from "./SongReader"; // O tu componente principal de lectura
import SongEditor from "./SongEditor_2";
import SongCreator from "./SongCreator_2";
import SetListEdit from "./SetListEdit_3";

// Componente para proteger rutas según el rol y token
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('easychart_token');
  const userRole = localStorage.getItem('easychart_role') || 'reader';

  const hasAccess = token && (userRole === 'admin' || userRole === 'editor');

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública (Reader / Inicio) */}
        <Route path="/" element={<SongReader />} />

        {/* Rutas protegidas para Editores y Administradores */}
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <SongCreator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <SongEditor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setlist-edit"
          element={
            <ProtectedRoute>
              <SetListEdit />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}