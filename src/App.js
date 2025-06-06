import { Routes, Route } from "react-router-dom";
import SongReader from "./components/SongReader";
import SongCreator from "./components/SongCreator";

export default function App() {
  return (
    <Routes>
      {/* Ruta por defecto: modo lectura */}
      <Route path="/" element={<SongReader />} />

      {/* Ruta para crear o editar canciones */}
      <Route path="/crear" element={<SongCreator />} />
    </Routes>
  );
}