const circulos = {
  C: {
    scale: ["C", "D", "E", "F", "G", "A", "B"],
    degrees: [
      
      {
        name: "C",
        degree: "I",
        type: "maj",
        common_extensions: ["C", "Cmaj7", "Cadd9", "Cmaj7+9", "Csus4", "Csus2", "C6", "Cmaj9"]
      },
      {
        name: "D",
        degree: "ii",
        type: "min",
        common_extensions: ["Dm", "Dm7", "Dm9", "Dm11", "Dsus4", "Dmin6"]
      },
      {
        name: "E",
        degree: "iii",
        type: "min",
        common_extensions: ["Em", "Em7", "Em9", "Em11", "Esus2"]
      },
      {
        name: "F",
        degree: "IV",
        type: "maj",
        common_extensions: ["F", "Fmaj7", "Fadd9", "Fsus4", "Fmaj9"]
      },
      {
        name: "G",
        degree: "V",
        type: "maj",
        common_extensions: ["G", "G7", "Gsus4", "G9", "G13"]
      },
      {
        name: "A",
        degree: "vi",
        type: "min",
        common_extensions: ["Am", "Am7", "Am9", "Am11", "Asus4"]
      },
      {
        name: "B",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Bdim", "Bø7", "Bdim7"]
      }
    ]
  },
  "C#": {
    scale: ["C#", "D#", "F", "F#", "G#", "A#", "C"],
    degrees: [
      {
        name: "C#",
        degree: "I",
        type: "maj",
        common_extensions: ["C#", "C#maj7", "C#add9", "C#maj7+9", "C#sus4", "C#sus2", "C#6", "C#maj9"]
      },
      {
        name: "D#",
        degree: "ii",
        type: "min",
        common_extensions: ["D#m", "D#m7", "D#m9", "D#m11", "D#sus4", "D#min6"]
      },
      {
        name: "F",
        degree: "iii",
        type: "min",
        common_extensions: ["Fm", "Fm7", "Fm9", "Fm11", "Fsus2"]
      },
      {
        name: "F#",
        degree: "IV",
        type: "maj",
        common_extensions: ["F#", "F#maj7", "F#add9", "F#sus4", "F#maj9"]
      },
      {
        name: "G#",
        degree: "V",
        type: "maj",
        common_extensions: ["G#", "G#7", "G#sus4", "G#9", "G#13"]
      },
      {
        name: "A#",
        degree: "vi",
        type: "min",
        common_extensions: ["A#m", "A#m7", "A#m9", "A#m11", "A#sus4"]
      },
      {
        name: "C",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Cdim", "Cø7", "Cdim7"]
      }
    ]
  },
  D: {
    scale: ["D", "E", "F#", "G", "A", "B", "C#"],
    degrees: [
      {
        name: "D",
        degree: "I",
        type: "maj",
        common_extensions: ["D", "Dmaj7", "Dadd9", "Dmaj7+9", "Dsus4", "Dsus2", "D6", "Dmaj9"]
      },
      {
        name: "E",
        degree: "ii",
        type: "min",
        common_extensions: ["Em", "Em7", "Em9", "Em11", "Esus4", "Emin6"]
      },
      {
        name: "F#",
        degree: "iii",
        type: "min",
        common_extensions: ["F#m", "F#m7", "F#m9", "F#m11", "F#sus2"]
      },
      {
        name: "G",
        degree: "IV",
        type: "maj",
        common_extensions: ["G", "Gmaj7", "Gadd9", "Gsus4", "Gmaj9"]
      },
      {
        name: "A",
        degree: "V",
        type: "maj",
        common_extensions: ["A", "A7", "Asus4", "A9", "A13"]
      },
      {
        name: "B",
        degree: "vi",
        type: "min",
        common_extensions: ["Bm", "Bm7", "Bm9", "Bm11", "Bsus4"]
      },
      {
        name: "C#",
        degree: "vii°",
        type: "dim",
        common_extensions: ["C#dim", "C#ø7", "C#dim7"]
      }
    ]
  },
  "D#": {
    scale: ["D#", "F", "G", "G#", "A#", "C", "D"],
    degrees: [
      {
        name: "D#",
        degree: "I",
        type: "maj",
        common_extensions: ["D#", "D#maj7", "D#add9", "D#maj7+9", "D#sus4", "D#sus2", "D#6", "D#maj9"]
      },
      {
        name: "F",
        degree: "ii",
        type: "min",
        common_extensions: ["Fm", "Fm7", "Fm9", "Fm11", "Fsus4", "Fmin6"]
      },
      {
        name: "G",
        degree: "iii",
        type: "min",
        common_extensions: ["Gm", "Gm7", "Gm9", "Gm11", "Gsus2"]
      },
      {
        name: "G#",
        degree: "IV",
        type: "maj",
        common_extensions: ["G#", "G#maj7", "G#add9", "G#sus4", "G#maj9"]
      },
      {
        name: "A#",
        degree: "V",
        type: "maj",
        common_extensions: ["A#", "A#7", "A#sus4", "A#9", "A#13"]
      },
      {
        name: "C",
        degree: "vi",
        type: "min",
        common_extensions: ["Cm", "Cm7", "Cm9", "Cm11", "Csus4"]
      },
      {
        name: "D",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Ddim", "Dø7", "Ddim7"]
      }
    ]
  },
  E: {
    scale: ["E", "F#", "G#", "A", "B", "C#", "D#"],
    degrees: [
      {
        name: "E",
        degree: "I",
        type: "maj",
        common_extensions: ["E", "Emaj7", "Eadd9", "Emaj7+9", "Esus4", "Esus2", "E6", "Emaj9"]
      },
      {
        name: "F#",
        degree: "ii",
        type: "min",
        common_extensions: ["F#m", "F#m7", "F#m9", "F#m11", "F#sus4", "F#min6"]
      },
      {
        name: "G#",
        degree: "iii",
        type: "min",
        common_extensions: ["G#m", "G#m7", "G#m9", "G#m11", "G#sus2"]
      },
      {
        name: "A",
        degree: "IV",
        type: "maj",
        common_extensions: ["A", "Amaj7", "Aadd9", "Asus4", "Amaj9"]
      },
      {
        name: "B",
        degree: "V",
        type: "maj",
        common_extensions: ["B", "B7", "Bsus4", "B9", "B13"]
      },
      {
        name: "C#",
        degree: "vi",
        type: "min",
        common_extensions: ["C#m", "C#m7", "C#m9", "C#m11", "C#sus4"]
      },
      {
        name: "D#",
        degree: "vii°",
        type: "dim",
        common_extensions: ["D#dim", "D#ø7", "D#dim7"]
      }
    ]
  },
  F: {
    scale: ["F", "G", "A", "A#", "C", "D", "E"],
    degrees: [
      {
        name: "F",
        degree: "I",
        type: "maj",
        common_extensions: ["F", "Fmaj7", "Fadd9", "Fmaj7+9", "Fsus4", "Fsus2", "F6", "Fmaj9"]
      },
      {
        name: "G",
        degree: "ii",
        type: "min",
        common_extensions: ["Gm", "Gm7", "Gm9", "Gm11", "Gsus4", "Gmin6"]
      },
      {
        name: "A",
        degree: "iii",
        type: "min",
        common_extensions: ["Am", "Am7", "Am9", "Am11", "Asus2"]
      },
      {
        name: "A#",
        degree: "IV",
        type: "maj",
        common_extensions: ["A#", "A#maj7", "A#add9", "A#sus4", "A#maj9"]
      },
      {
        name: "C",
        degree: "V",
        type: "maj",
        common_extensions: ["C", "C7", "Csus4", "C9", "C13"]
      },
      {
        name: "D",
        degree: "vi",
        type: "min",
        common_extensions: ["Dm", "Dm7", "Dm9", "Dm11", "Dsus4"]
      },
      {
        name: "E",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Edim", "Eø7", "Edim7"]
      }
    ]
  },
  "F#": {
    scale: ["F#", "G#", "A#", "B", "C#", "D#", "F"],
    degrees: [
      {
        name: "F#",
        degree: "I",
        type: "maj",
        common_extensions: ["F#", "F#maj7", "F#add9", "F#maj7+9", "F#sus4", "F#sus2", "F#6", "F#maj9"]
      },
      {
        name: "G#",
        degree: "ii",
        type: "min",
        common_extensions: ["G#m", "G#m7", "G#m9", "G#m11", "G#sus4", "G#min6"]
      },
      {
        name: "A#",
        degree: "iii",
        type: "min",
        common_extensions: ["A#m", "A#m7", "A#m9", "A#m11", "A#sus2"]
      },
      {
        name: "B",
        degree: "IV",
        type: "maj",
        common_extensions: ["B", "Bmaj7", "Badd9", "Bsus4", "Bmaj9"]
      },
      {
        name: "C#",
        degree: "V",
        type: "maj",
        common_extensions: ["C#", "C#7", "C#sus4", "C#9", "C#13"]
      },
      {
        name: "D#",
        degree: "vi",
        type: "min",
        common_extensions: ["D#m", "D#m7", "D#m9", "D#m11", "D#sus4"]
      },
      {
        name: "F",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Fdim", "Fø7", "Fdim7"]
      }
    ]
  },
  G: {
    scale: ["G", "A", "B", "C", "D", "E", "F#"],
    degrees: [
      {
        name: "G",
        degree: "I",
        type: "maj",
        common_extensions: ["G", "Gmaj7", "Gadd9", "Gmaj7+9", "Gsus4", "Gsus2", "G6", "Gmaj9"]
      },
      {
        name: "A",
        degree: "ii",
        type: "min",
        common_extensions: ["Am", "Am7", "Am9", "Am11", "Asus4", "Amin6"]
      },
      {
        name: "B",
        degree: "iii",
        type: "min",
        common_extensions: ["Bm", "Bm7", "Bm9", "Bm11", "Bsus2"]
      },
      {
        name: "C",
        degree: "IV",
        type: "maj",
        common_extensions: ["C", "Cmaj7", "Cadd9", "Csus4", "Cmaj9"]
      },
      {
        name: "D",
        degree: "V",
        type: "maj",
        common_extensions: ["D", "D7", "Dsus4", "D9", "D13"]
      },
      {
        name: "E",
        degree: "vi",
        type: "min",
        common_extensions: ["Em", "Em7", "Em9", "Em11", "Esus4"]
      },
      {
        name: "F#",
        degree: "vii°",
        type: "dim",
        common_extensions: ["F#dim", "F#ø7", "F#dim7"]
      }
    ]
  },
  "G#": {
    scale: ["G#", "A#", "C", "C#", "D#", "F", "G"],
    degrees: [
      {
        name: "G#",
        degree: "I",
        type: "maj",
        common_extensions: ["G#", "G#maj7", "G#add9", "G#maj7+9", "G#sus4", "G#sus2", "G#6", "G#maj9"]
      },
      {
        name: "A#",
        degree: "ii",
        type: "min",
        common_extensions: ["A#m", "A#m7", "A#m9", "A#m11", "A#sus4", "A#min6"]
      },
      {
        name: "C",
        degree: "iii",
        type: "min",
        common_extensions: ["Cm", "Cm7", "Cm9", "Cm11", "Csus2"]
      },
      {
        name: "C#",
        degree: "IV",
        type: "maj",
        common_extensions: ["C#", "C#maj7", "C#add9", "C#sus4", "C#maj9"]
      },
      {
        name: "D#",
        degree: "V",
        type: "maj",
        common_extensions: ["D#", "D#7", "D#sus4", "D#9", "D#13"]
      },
      {
        name: "F",
        degree: "vi",
        type: "min",
        common_extensions: ["Fm", "Fm7", "Fm9", "Fm11", "Fsus4"]
      },
      {
        name: "G",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Gdim", "Gø7", "Gdim7"]
      }
    ]
  },
  A: {
    scale: ["A", "B", "C#", "D", "E", "F#", "G#"],
    degrees: [
      {
        name: "A",
        degree: "I",
        type: "maj",
        common_extensions: ["A", "Amaj7", "Aadd9", "Amaj7+9", "Asus4", "Asus2", "A6", "Amaj9"]
      },
      {
        name: "B",
        degree: "ii",
        type: "min",
        common_extensions: ["Bm", "Bm7", "Bm9", "Bm11", "Bsus4", "Bmin6"]
      },
      {
        name: "C#",
        degree: "iii",
        type: "min",
        common_extensions: ["C#m", "C#m7", "C#m9", "C#m11", "C#sus2"]
      },
      {
        name: "D",
        degree: "IV",
        type: "maj",
        common_extensions: ["D", "Dmaj7", "Dadd9", "Dsus4", "Dmaj9"]
      },
      {
        name: "E",
        degree: "V",
        type: "maj",
        common_extensions: ["E", "E7", "Esus4", "E9", "E13"]
      },
      {
        name: "F#",
        degree: "vi",
        type: "min",
        common_extensions: ["F#m", "F#m7", "F#m9", "F#m11", "F#sus4"]
      },
      {
        name: "G#",
        degree: "vii°",
        type: "dim",
        common_extensions: ["G#dim", "G#ø7", "G#dim7"]
      }
    ]
  },
  "A#": {
    scale: ["A#", "C", "D", "D#", "F", "G", "A"],
    degrees: [
      {
        name: "A#",
        degree: "I",
        type: "maj",
        common_extensions: ["A#", "A#maj7", "A#add9", "A#maj7+9", "A#sus4", "A#sus2", "A#6", "A#maj9"]
      },
      {
        name: "C",
        degree: "ii",
        type: "min",
        common_extensions: ["Cm", "Cm7", "Cm9", "Cm11", "Csus4", "Cmin6"]
      },
      {
        name: "D",
        degree: "iii",
        type: "min",
        common_extensions: ["Dm", "Dm7", "Dm9", "Dm11", "Dsus2"]
      },
      {
        name: "D#",
        degree: "IV",
        type: "maj",
        common_extensions: ["D#", "D#maj7", "D#add9", "D#sus4", "D#maj9"]
      },
      {
        name: "F",
        degree: "V",
        type: "maj",
        common_extensions: ["F", "F7", "Fsus4", "F9", "F13"]
      },
      {
        name: "G",
        degree: "vi",
        type: "min",
        common_extensions: ["Gm", "Gm7", "Gm9", "Gm11", "Gsus4"]
      },
      {
        name: "A",
        degree: "vii°",
        type: "dim",
        common_extensions: ["Adim", "Aø7", "Adim7"]
      }
    ]
  },
  B: {
    scale: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    degrees: [
      {
        name: "B",
        degree: "I",
        type: "maj",
        common_extensions: ["B", "Bmaj7", "Badd9", "Bmaj7+9", "Bsus4", "Bsus2", "B6", "Bmaj9"]
      },
      {
        name: "C#",
        degree: "ii",
        type: "min",
        common_extensions: ["C#m", "C#m7", "C#m9", "C#m11", "C#sus4", "C#min6"]
      },
      {
        name: "D#",
        degree: "iii",
        type: "min",
        common_extensions: ["D#m", "D#m7", "D#m9", "D#m11", "D#sus2"]
      },
      {
        name: "E",
        degree: "IV",
        type: "maj",
        common_extensions: ["E", "Emaj7", "Eadd9", "Esus4", "Emaj9"]
      },
      {
        name: "F#",
        degree: "V",
        type: "maj",
        common_extensions: ["F#", "F#7", "F#sus4", "F#9", "F#13"]
      },
      {
        name: "G#",
        degree: "vi",
        type: "min",
        common_extensions: ["G#m", "G#m7", "G#m9", "G#m11", "G#sus4"]
      },
      {
        name: "A#",
        degree: "vii°",
        type: "dim",
        common_extensions: ["A#dim", "A#ø7", "A#dim7"]
      }
    ]
  }
};

export default circulos;