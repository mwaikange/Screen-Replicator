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

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Incident Map</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
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
              <Ionicons name="layers-outline" size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="navigate-outline" size={20} color={colors.cardForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.marker, { bottom: '30%', left: '25%' }]}>
            <View style={styles.markerOuter}>
              <View style={styles.markerInner}>
                <View style={styles.markerDot} />
              </View>
            </View>
          </View>
          <View style={[styles.marker, { bottom: '30%', right: '25%' }]}>
            <View style={styles.markerOuter}>
              <View style={styles.markerInner}>
                <View style={styles.markerDot} />
              </View>
            </View>
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.xs,
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
    backgroundColor: '#e8f4fc',
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
    borderColor: '#d0e3ef',
  },
  legendCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.cardForeground,
  },
  mapControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  mapButton: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marker: {
    position: 'absolute',
  },
  markerOuter: {
    width: 48,
    height: 48,
    backgroundColor: colors.warning,
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
  markerDot: {
    width: 12,
    height: 12,
    backgroundColor: colors.success,
    borderRadius: 6,
  },
});
