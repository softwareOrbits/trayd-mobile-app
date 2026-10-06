import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import type { ConfigReport } from './validateConfig';

const NAVY = '#16345A';
const CREAM = '#F4EFE4';
const RED = '#B42318';
const AMBER = '#9A5B0A';

export const ConfigErrorScreen = ({ report }: { report: ConfigReport }) => (
  <View style={styles.root}>
    <StatusBar barStyle="light-content" backgroundColor={NAVY} />
    <View style={styles.header}>
      <Text style={styles.eyebrow}>TRAYD · {report.environment.toUpperCase()}</Text>
      <Text style={styles.title}>Configuration problem</Text>
      <Text style={styles.subtitle}>
        The app can’t start with this build’s settings. Fix the items below and rebuild.
      </Text>
    </View>
    <ScrollView contentContainerStyle={styles.body}>
      {report.problems.map((p, i) => (
        <View
          key={`${p.area}-${i}`}
          style={[styles.item, p.level === 'error' ? styles.itemError : styles.itemWarning]}
        >
          <Text
            style={[styles.tag, { color: p.level === 'error' ? RED : AMBER }]}
          >
            {`${p.level.toUpperCase()} · ${p.area.toUpperCase()}`}
          </Text>
          <Text style={styles.message}>{p.message}</Text>
        </View>
      ))}
      <View style={styles.summary}>
        <Text style={styles.summaryLine}>{`Environment: ${report.environment}`}</Text>
        <Text style={styles.summaryLine}>{`Web app: ${report.webUrl}`}</Text>
        <Text style={styles.summaryLine}>{`Supabase: ${report.supabaseRef ?? 'not set'}`}</Text>
        <Text style={styles.summaryLine}>{`Firebase: ${report.firebaseProject ?? 'not set'}`}</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: NAVY, paddingTop: 64, paddingBottom: 22, paddingHorizontal: 22 },
  eyebrow: { color: '#C9D3E3', fontSize: 11, letterSpacing: 1.2, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 6 },
  subtitle: { color: '#DCE3EE', fontSize: 14, lineHeight: 20, marginTop: 6 },
  body: { padding: 18, gap: 12 },
  item: { borderRadius: 12, padding: 14, borderWidth: 1, backgroundColor: '#FFFFFF' },
  itemError: { borderColor: '#F3C4BF' },
  itemWarning: { borderColor: '#F1DDBA' },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  message: { color: '#0E1A2D', fontSize: 14.5, lineHeight: 20 },
  summary: { marginTop: 4, padding: 14, borderRadius: 12, backgroundColor: '#EFEAE0', gap: 4 },
  summaryLine: { color: '#5A6577', fontSize: 13 },
});

export default ConfigErrorScreen;
