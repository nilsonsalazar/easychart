import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import toRoman from "./toRoman";



const getFontUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}/fonts/ProtestRevolution-Regular.ttf`;
  }
  return `${process.env.PUBLIC_URL || ''}/fonts/ProtestRevolution-Regular.ttf`;
};

Font.register({
  family: 'Protest Revolution',
  src: getFontUrl(),
  fontWeight: 'normal',
  fontStyle: 'normal'
});

// Estilos PDF usando la fuente personalizada 'Protest Revolution'
const styles = StyleSheet.create({
  sectionHeaderLeft: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 60,
  },
  page: {
    padding: 30,
    fontFamily: 'Protest Revolution'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center'
  },
  artist: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center'
  },
  key: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 16
  },
  sectionHeader: {
    marginBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1F2937',
    paddingBottom: 2
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827'
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  measure: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
    padding: 4,
    marginRight: -1,
    marginBottom: -1,
    minWidth: 80,
    flex: 1
  },
  measureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  measureNumber: {
    fontSize: 8,
    color: '#6B7280'
  },
  divisions: {
    flexDirection: 'row'
  },
  division: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24
  },
  chord: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  repeatSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 4,
    alignSelf: 'center',
    color: '#111827'
  }
});

const SongPDF = ({ title, artist, sections = [], keySignature = "C", tempo = "120" }) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title || "Composición Musical"}</Text>
        {artist && <Text style={styles.artist}>{artist}</Text>}
        <Text style={styles.key}>Tonalidad: {keySignature} • Tempo: {tempo}</Text>
        
        {safeSections.map((sec, secIdx) => {
          let measureCount = 0;
          const lineas = Array.isArray(sec?.lineas) ? sec.lineas : [];
          return (
            <View key={secIdx} style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {sec?.nombre || `Sección ${secIdx + 1}`} {sec?.compas ? `• ${sec.compas}` : ''}
                </Text>
              </View>
              {lineas.map((linea, lIdx) => {
                const compasses = Array.isArray(linea?.compasses) ? linea.compasses : [];
                return (
                  <View key={lIdx} style={styles.line}>
                    {linea?.repetir && <Text style={styles.repeatSymbol}>||:</Text>}
                    {compasses.map((compass, cIdx) => {
                      measureCount++;
                      const acordes = Array.isArray(compass?.acordes) ? compass.acordes : [];
                      return (
                        <View key={cIdx} style={styles.measure}>
                          <View style={styles.measureHeader}>
                            <Text style={styles.measureNumber}>{toRoman(measureCount)}</Text>
                          </View>
                          <View style={styles.divisions}>
                            {acordes.map((acorde, dIdx) => (
                              <View key={dIdx} style={styles.division}>
                                <Text style={styles.chord}>{acorde?.valor || "-"}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    {linea?.repetir && <Text style={styles.repeatSymbol}>:||</Text>}
                  </View>
                );
              })}
            </View>
          );
        })}
      </Page>
    </Document>
  );
};

export default SongPDF;