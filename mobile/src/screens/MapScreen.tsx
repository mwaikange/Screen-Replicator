import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { Post } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const severityLegend = [
  { level: 'Critical', color: '#EF4444' },
  { level: 'High', color: '#F97316' },
  { level: 'Medium', color: '#EAB308' },
  { level: 'Low', color: '#BEF264' },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  missing_person: { label: 'Missing Person', color: '#ef4444' },
  MISSING_PERSON: { label: 'Missing Person', color: '#ef4444' },
  incident: { label: 'Crime Report', color: '#ef4444' },
  CRIME: { label: 'Crime Report', color: '#ef4444' },
  alert: { label: 'Emergency Alert', color: '#ea580c' },
  ALERT: { label: 'Emergency Alert', color: '#ea580c' },
  gender_based_violence: { label: 'Gender-Based Violence', color: '#9333ea' },
  GBV: { label: 'Gender-Based Violence', color: '#9333ea' },
  theft: { label: 'Theft', color: '#dc2626' },
  THEFT: { label: 'Theft', color: '#dc2626' },
  suspicious_activity: { label: 'Suspicious Activity', color: '#ca8a04' },
  SUSPICIOUS: { label: 'Suspicious Activity', color: '#ca8a04' },
  FRAUD: { label: 'Fraud', color: '#f59e0b' },
  VANDALISM: { label: 'Vandalism', color: '#f97316' },
  ASSAULT: { label: 'Assault', color: '#dc2626' },
  ROBBERY: { label: 'Robbery', color: '#b91c1c' },
  OTHER: { label: 'Other', color: '#6b7280' },
};

function groupAndOffsetPins(posts: Post[]): (Post & { offsetLat: number; offsetLng: number })[] {
  const groups: Record<string, Post[]> = {};
  for (const post of posts) {
    const lat = post.latitude ? Math.round(post.latitude * 100) / 100 : 0;
    const lng = post.longitude ? Math.round(post.longitude * 100) / 100 : 0;
    const key = `${lat},${lng}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(post);
  }

  const result: (Post & { offsetLat: number; offsetLng: number })[] = [];
  const SPIRAL_STEP = 0.003;

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length === 1) {
      result.push({ ...group[0], offsetLat: group[0].latitude || 0, offsetLng: group[0].longitude || 0 });
    } else {
      group.forEach((post, i) => {
        if (i === 0) {
          result.push({ ...post, offsetLat: post.latitude || 0, offsetLng: post.longitude || 0 });
        } else {
          const angle = (2 * Math.PI * i) / (group.length - 1);
          const radius = SPIRAL_STEP * (1 + Math.floor(i / 6));
          const offsetLat = (post.latitude || 0) + radius * Math.cos(angle);
          const offsetLng = (post.longitude || 0) + radius * Math.sin(angle);
          result.push({ ...post, offsetLat, offsetLng });
        }
      });
    }
  }

  return result;
}

function getSeverityColor(severity: number): string {
  if (severity >= 5) return '#EF4444';
  if (severity >= 4) return '#F97316';
  if (severity >= 3) return '#EAB308';
  return '#BEF264';
}

function IncidentMarker({ markerColor }: { markerColor: string }) {
  return (
    <View style={styles.marker}>
      <View style={[styles.markerOuter, { backgroundColor: markerColor }]}>
        <View style={styles.markerInner}>
          <View style={[styles.markerRing, { backgroundColor: markerColor }]}>
            <View style={styles.markerDot} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    postsApi.getAll().then(res => {
      const verified = (res.data || []).filter((p: Post) => (p.verificationLevel || 0) > 0);
      setPosts(verified);
    });
  }, []);

  const handleMarkerPress = useCallback((post: Post) => {
    setSelectedPost(post);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (selectedPost) {
      navigation.navigate('IncidentDetails', { postId: selectedPost.id });
      setSelectedPost(null);
    }
  }, [selectedPost, navigation]);

  const handleClosePopup = useCallback(() => {
    setSelectedPost(null);
  }, []);

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

          <View style={styles.currentLocationDot} />

          {groupAndOffsetPins(posts).map((post, index) => {
            const postSeverity = post.severity || 3;
            const pinColor = getSeverityColor(postSeverity);
            const topPct = post.offsetLat ? ((post.offsetLat + 90) / 180) * 0.7 + 0.1 : 0.3 + (index * 0.08) % 0.4;
            const leftPct = post.offsetLng ? ((post.offsetLng + 180) / 360) * 0.7 + 0.1 : 0.1 + (index * 0.15) % 0.7;
            const pinZIndex = 10 + postSeverity;
            return (
              <TouchableOpacity
                key={post.id}
                style={[
                  styles.markerPosition,
                  {
                    top: `${topPct * 100}%` as any,
                    left: `${leftPct * 100}%` as any,
                    zIndex: pinZIndex,
                  },
                ]}
                onPress={() => handleMarkerPress(post)}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <IncidentMarker markerColor={pinColor} />
              </TouchableOpacity>
            );
          })}

          {selectedPost && (
            <View style={styles.popupContainer}>
              <View style={styles.popup}>
                <TouchableOpacity style={styles.popupClose} onPress={handleClosePopup}>
                  <Ionicons name="close" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <View style={styles.popupBadgeRow}>
                  <View style={[styles.popupBadge, { backgroundColor: typeLabels[selectedPost.type]?.color || '#ea580c' }]}>
                    <Text style={styles.popupBadgeText}>
                      {typeLabels[selectedPost.type]?.label || 'Alert'}
                    </Text>
                  </View>
                  <View style={[styles.severityChip, { backgroundColor: getSeverityColor(selectedPost.severity || 3) }]} />
                </View>
                <Text style={styles.popupTitle} numberOfLines={3}>{selectedPost.title}</Text>
                <View style={styles.popupLocation}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.popupLocationText}>{selectedPost.userTown}</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsButton} onPress={handleViewDetails}>
                  <Text style={styles.viewDetailsText}>View Incident</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  currentLocationDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3b82f6',
    marginLeft: -7,
    marginTop: -7,
    zIndex: 5,
  },
  markerPosition: {
    position: 'absolute',
    zIndex: 10,
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
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    zIndex: 100,
  },
  popup: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popupClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  popupBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  popupBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityChip: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  popupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
    lineHeight: 22,
    marginBottom: 8,
    paddingRight: 24,
  },
  popupLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  popupLocationText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  viewDetailsButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '600',
  },
});
