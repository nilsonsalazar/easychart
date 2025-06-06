export const transposeChord = (chord, semitones) => {
  if (!chord || chord === "-" || chord.trim() === "") return "-";
  
  const noteOrder = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteOrderFlats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  
  const baseNoteMatch = chord.match(/^[A-Ga-g][#b]?/);
  if (!baseNoteMatch) return chord;
  
  const baseNote = baseNoteMatch[0].toUpperCase();
  const suffix = chord.slice(baseNote.length);
  
  const originalIndexSharp = noteOrder.indexOf(baseNote);
  const originalIndexFlat = noteOrderFlats.indexOf(baseNote);
  const originalIndex = originalIndexSharp !== -1 ? originalIndexSharp : originalIndexFlat;
  
  if (originalIndex === -1) return chord;
  
  let newIndex = (originalIndex + semitones) % 12;
  if (newIndex < 0) newIndex += 12;
  
  const useSharps = originalIndexSharp !== -1 || 
                   (semitones > 0 && semitones % 12 <= 6) || 
                   (semitones < 0 && semitones % 12 >= -6);
  
  const newBaseNote = useSharps ? noteOrder[newIndex] : noteOrderFlats[newIndex];
  
  if (chord.includes('/')) {
    const [mainChord, bassNote] = chord.split('/');
    const transposedMain = transposeChord(mainChord, semitones);
    const transposedBass = transposeChord(bassNote, semitones);
    return `${transposedMain}/${transposedBass}`;
  }
  
  return newBaseNote + suffix;
};

export const cambiarTonalidad = (tonoActual, nuevoTono, secciones, semitono = 0) => {
  const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const indexActual = notas.indexOf(tonoActual);
  const indexNuevo = notas.indexOf(nuevoTono);
  const diferenciaTotal = (indexNuevo - indexActual) + semitono;
  
  return secciones.map(sec => ({
    ...sec,
    lineas: sec.lineas.map(linea => ({
      ...linea,
      compasses: linea.compasses.map(compass => ({
        ...compass,
        acordes: compass.acordes.map(acorde => ({
          ...acorde,
          valor: acorde.valor ? transposeChord(acorde.valor, diferenciaTotal) : ""
        }))
      }))
    }))
  }));
};

export const ajustarSemitono = (tonoActual, semitonoDelta, secciones) => {
  const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const indexActual = notas.indexOf(tonoActual);
  const diferencialTotal = semitonoDelta;
  
  return secciones.map(sec => ({
    ...sec,
    lineas: sec.lineas.map(linea => ({
      ...linea,
      compasses: linea.compasses.map(compass => ({
        ...compass,
        acordes: compass.acordes.map(acorde => ({
          ...acorde,
          valor: transposeChord(acorde.valor, diferencialTotal)
        }))
      }))
    }))
  }));
};