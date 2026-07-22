import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import toRoman from "./toRoman";



// Registrar la fuente
Font.register({
  family: 'Protest Revolution',
  src: '/fonts/ProtestRevolution-Regular.ttf',
  fontWeight: 'normal',
  fontStyle: 'normal'
});

// Estilos PDF
const styles = StyleSheet.create({
    sectionHeaderLeft: {
  marginRight: 8,
  justifyContent: 'center',
  alignItems: 'flex-end',
  width: 60, // o ajusta al ancho deseado
},
  page: {
    padding: 30,
    fontFamily: 'Protest Revolution'
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center'
  },
  key: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 20
  },
  sectionHeader: {
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15
  },
  measure: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 2,
    marginRight: -1,
    minWidth: 100
  },
  measureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  measureNumber: {
    fontSize: 10
  },
  divisions: {
    flexDirection: 'row'
  },
  division: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30
  },
  chord: {
    fontSize: 12
  },
  repeatSymbol: {
    fontSize: 20,
    marginHorizontal: 5,
    alignSelf: "center"
  }
});

const SongPDF = ({ title, sections, keySignature, tempo }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title || "Musical Composition"}</Text>
        <Text style={styles.key}>Key: {keySignature} • Tempo: {tempo}</Text>
        
        {sections.map((sec, secIdx) => {
          let measureCount = 0;
          return (
            <View key={secIdx} style={styles.section} wrap={false}>
              {/* Header de sección */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {sec.nombre} • {sec.compas}
                </Text>
              </View>
              {/* Líneas */}
              {sec.lineas.map((linea, lIdx) => (
                <View key={lIdx} style={styles.line}>
                  {/* Símbolo de repetición al inicio */}
                  {linea.repetir && <Text style={styles.repeatSymbol}>||:</Text>}
                  {/* Compases */}
                  {linea.compasses.map((compass, cIdx) => {
                    measureCount++;
                    return (
                      <View key={cIdx} style={styles.measure}>
                        <View style={styles.measureHeader}>
                          <Text style={styles.measureNumber}>{toRoman(measureCount)}</Text>
                        </View>
                        <View style={styles.divisions}>
                          {compass.acordes.map((acorde, dIdx) => (
                            <View key={dIdx} style={styles.division}>
                              <Text style={styles.chord}>{acorde.valor || "-"}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                  {/* Símbolo de cierre de repetición */}
                  {linea.repetir && <Text style={styles.repeatSymbol}>:||</Text>}
                </View>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
};

export default SongPDF;