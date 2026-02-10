import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';

const appLogo = require('../../assets/logo.jpg');

const severityLegend = [
  { level: 'Critical', color: '#ef4444' },
  { level: 'High', color: '#f87171' },
  { level: 'Medium', color: '#f59e0b' },
  { level: 'Low', color: '#fbbf24' },
];

function IncidentMarker({ severity }: { severity: 'critical' | 'high' | 'medium' | 'low' }) {
  const markerColors = {
    critical: '#ef4444',
    high: '#f87171',
    medium: '#f59e0b',
    low: '#fbbf24',
  };

  return (
    <View style={styles.marker}>
      <View style={[styles.markerOuter, { backgroundColor: markerColors[severity] }]}>
        <View style={styles.markerInner}>
          <View style={[styles.markerRing, { backgroundColor: markerColors[severity] }]}>
            <View style={styles.markerDot} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Incident Map</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <View style={styles.gridPattern}>
            {Array.from({ length: 100 }).map((_, i) => (
              <View key={i} style={styles.gridCell} />
            ))}
          </View>

          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Severity</Text>
            {severityLegend.map((item) => (
              <View key={item.level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.level}</Text>
              </View>
            ))}
          </View>

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="layers-outline" size={16} color={colors.cardForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="navigate-outline" size={16} color={colors.cardForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.markerPosition, { bottom: '30%', left: '25%' }]}>
            <IncidentMarker severity="medium" />
          </View>
          <View style={[styles.markerPosition, { bottom: '30%', right: '25%' }]}>
            <IncidentMarker severity="medium" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#eff6ff',
    position: 'relative',
  },
  gridPattern: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '10%',
    height: 60,
    borderWidth: 0.5,
    borderColor: '#e0e7ef',
  },
  legendCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  mapControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    gap: 8,
  },
  mapButton: {
    backgroundColor: colors.muted,
    borderRadius: 6,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerPosition: {
    position: 'absolute',
  },
  marker: {},
  markerOuter: {
    width: 48,
    height: 48,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerInner: {
    width: 32,
    height: 32,
    backgroundColor: colors.card,
    borderRadius: 4,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
});
