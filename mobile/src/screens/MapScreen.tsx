import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert as RNAlert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import NotificationBell from '../components/NotificationBell';
import { colors, spacing } from '../lib/theme';
import { supabase } from '../lib/supabase';

const MAP_API = 'https://app.ngumus-eye.site/api/map-incidents'; // kept for reference

type MapIncident = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  town: string | null;
  severity: string | null;
  area_radius_m: number | null;
  created_at: string;
  verified_expiry: string | null;
  type_label: string | null;
  type_severity: number | null;
};

const appLogo = require('../../assets/logo.jpg');

// ─── Default: Windhoek, Namibia ───────────────────────────────────────────────
const WINDHOEK: Region = {
  latitude: -22.5594,
  longitude: 17.0832,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// ─── Radius options for the view picker ───────────────────────────────────────
const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Show all incidents', value: null },
  { label: '500 m',   value: 500 },
  { label: '1 km',    value: 1000 },
  { label: '2 km',    value: 2000 },
  { label: '5 km',    value: 5000 },
  { label: '10 km',   value: 10000 },
  { label: '25 km',   value: 25000 },
  { label: '50 km',   value: 50000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function severityColor(severity: number): string {
  if (severity >= 5) return '#EF4444';
  if (severity >= 4) return '#F97316';
  if (severity >= 3) return '#EAB308';
  return '#22c55e';
}

function severityLabel(severity: number): string {
  if (severity >= 5) return 'Critical';
  if (severity >= 4) return 'High';
  if (severity >= 3) return 'Medium';
  return 'Low';
}

// ─── Cluster nearby incidents (within ~50m of each other) ────────────────────
type Cluster = {
  incidents: MapIncident[];
  lat: number;
  lng: number;
  topSeverity: number;
};

function clusterIncidents(incidents: MapIncident[]): Cluster[] {
  const THRESHOLD_M = 80; // group pins within 80 metres
  const used = new Set<number>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < incidents.length; i++) {
    if (used.has(i)) continue;
    const group: MapIncident[] = [incidents[i]];
    used.add(i);

    for (let j = i + 1; j < incidents.length; j++) {
      if (used.has(j)) continue;
      const dist = haversineMeters(
        incidents[i].lat, incidents[i].lng,
        incidents[j].lat, incidents[j].lng
      );
      if (dist <= THRESHOLD_M) {
        group.push(incidents[j]);
        used.add(j);
      }
    }

    const topSeverity = Math.max(...group.map(p => p.type_severity || 3));
    clusters.push({
      incidents: group,
      lat: incidents[i].lat,
      lng: incidents[i].lng,
      topSeverity,
    });
  }
  return clusters;
}

// ─── Google Maps style teardrop pin ──────────────────────────────────────────
const PinMarker = memo(function PinMarker({ severityColor, count }: { severityColor: string; count: number }) {
  return (
    <View style={pin.container}>
      {/* Outer teardrop shape */}
      <View style={pin.outerShape}>
        {/* Top round circle area */}
        <View style={pin.topCircle}>
          {/* Inner severity dot */}
          <View style={[pin.innerCircle, { backgroundColor: severityColor }]}>
            {count > 1 && (
              <Text style={pin.countText}>{count > 99 ? '99+' : count}</Text>
            )}
          </View>
        </View>
        {/* Bottom pointed tip */}
        <View style={pin.bottomTip} />
      </View>
      {/* Shadow ellipse */}
      <View style={pin.shadowEllipse} />
    </View>
  );

});

const PIN_RED = '#D32F2F';
const PIN_DARK = '#B71C1C';

const pin = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 50,
  },
  outerShape: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  topCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PIN_RED,
    borderWidth: 3,
    borderColor: PIN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  innerCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 8,
    fontWeight: '800',
    color: 'white',
  },
  bottomTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: PIN_RED,
    marginTop: -5,
    zIndex: 1,
  },
  shadowEllipse: {
    width: 20,
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const [posts, setPosts]                       = useState<MapIncident[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [userLocation, setUserLocation]         = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted]   = useState(false);
  const [selectedPost, setSelectedPost]         = useState<MapIncident | null>(null);
  const [selectedClusterCount, setSelectedClusterCount] = useState(1);
  const [viewRadius, setViewRadius]             = useState<number | null>(null);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const [markersReady, setMarkersReady]         = useState(false);

  // Load map incidents directly from Supabase (same logic as /api/map-incidents)
  useEffect(() => {
    (async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('incidents')
          .select(`
            id, title, lat, lng, town, severity,
            area_radius_m, created_at, verified_expiry,
            incident_types!type_id ( label, severity )
          `)
          .eq('admin_verified', true)
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .gt('verified_expiry', now)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('[MapScreen] Supabase error:', error);
          return;
        }

        const incidents: MapIncident[] = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          lat: row.lat,
          lng: row.lng,
          town: row.town ?? null,
          severity: row.severity ?? null,
          area_radius_m: row.area_radius_m ?? null,
          created_at: row.created_at,
          verified_expiry: row.verified_expiry ?? null,
          type_label: row.incident_types?.label ?? null,
          type_severity: row.incident_types?.severity ?? null,
        }));

        console.log('[MapScreen] Loaded incidents:', incidents.length);
        setPosts(incidents);
        // Flip tracksViewChanges off after a short delay so pins render then stop tracking
        setTimeout(() => setMarkersReady(true), 500);
      } catch (e) {
        console.error('[MapScreen] Error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Request location + centre map
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationGranted(false); return; }
      setLocationGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
      } catch (e) {
        console.warn('Location error:', e);
      }
    })();
  }, []);

  // ─── Filter by radius ─────────────────────────────────────────────────────
  const visiblePosts = posts.filter(p => {
    // No custom radius set → show ALL incidents on the map
    if (viewRadius === null) return true;
    // User picked a custom radius → filter by distance from their location
    if (!userLocation) return true;
    const dist = haversineMeters(
      userLocation.latitude, userLocation.longitude,
      p.lat, p.lng
    );
    return dist <= viewRadius;
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleViewDetails = useCallback(() => {
    if (!selectedPost) return;
    navigation.navigate('IncidentDetails', { postId: selectedPost.id });
    setSelectedPost(null);
  }, [selectedPost, navigation]);

  const centerOnUser = useCallback(() => {
    if (userLocation) {
      mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 600);
    } else {
      RNAlert.alert('Location Unavailable', 'Enable location access in your device settings.');
    }
  }, [userLocation]);

  // Memoize clusters — prevents recompute on every render
  const clusters = useCallback(() => clusterIncidents(visiblePosts), [visiblePosts])();

  const currentRadiusLabel = viewRadius === null
    ? 'All incidents'
    : RADIUS_OPTIONS.find(o => o.value === viewRadius)?.label ?? `${viewRadius} m`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Incident Map</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{visiblePosts.length} shown</Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      {/* ── Map ── */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={WINDHOEK}
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
          showsCompass
          showsScale
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          onPress={() => setSelectedPost(null)}
        >
          {/* View radius circle */}
          {userLocation && viewRadius !== null && (
            <Circle
              center={userLocation}
              radius={viewRadius}
              fillColor="rgba(59,130,246,0.07)"
              strokeColor="rgba(59,130,246,0.35)"
              strokeWidth={1.5}
            />
          )}

          {/* Incident markers — clustered */}
          {clusters.map((cluster, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              onPress={() => {
                // Show the most severe incident in the cluster
                const top = cluster.incidents.reduce((a, b) =>
                  (b.type_severity || 0) > (a.type_severity || 0) ? b : a
                );
                setSelectedPost(top);
                setSelectedClusterCount(cluster.incidents.length);
              }}
              tracksViewChanges={!markersReady}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PinMarker
                severityColor={severityColor(cluster.topSeverity)}
                count={cluster.incidents.length}
              />
            </Marker>
          ))}
        </MapView>

        {/* FAB stack — right side */}
        <View style={styles.fabStack}>
          <TouchableOpacity style={styles.fab} onPress={centerOnUser} activeOpacity={0.8}>
            <Ionicons name="locate-outline" size={21} color={colors.cardForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => setShowRadiusPicker(true)} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={21} color={colors.cardForeground} />
          </TouchableOpacity>
        </View>

        {/* Radius pill — top right */}
        <TouchableOpacity style={styles.radiusPill} onPress={() => setShowRadiusPicker(true)} activeOpacity={0.8}>
          <Ionicons name="radio-outline" size={12} color={colors.primary} />
          <Text style={styles.radiusPillText}>View: {currentRadiusLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* Incident popup */}
        {selectedPost && (
          <View style={styles.popupContainer}>
            <View style={styles.popup}>
              <TouchableOpacity style={styles.popupClose} onPress={() => { setSelectedPost(null); setSelectedClusterCount(1); }}>
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              {selectedClusterCount > 1 && (
                <View style={styles.clusterNote}>
                  <Ionicons name="layers-outline" size={13} color={colors.primary} />
                  <Text style={styles.clusterNoteText}>
                    {selectedClusterCount} incidents at this location — showing most severe
                  </Text>
                </View>
              )}

              <View style={styles.popupBadgeRow}>
                <View style={[styles.popupTypeBadge, { backgroundColor: severityColor(selectedPost.type_severity || 3) }]}>
                  <Text style={styles.popupTypeBadgeText}>
                    {selectedPost.type_label || 'Incident'}
                  </Text>
                </View>
                <View style={[styles.popupSevBadge, { backgroundColor: severityColor(selectedPost.type_severity || 3) + '22' }]}>
                  <Text style={[styles.popupSevText, { color: severityColor(selectedPost.type_severity || 3) }]}>
                    {severityLabel(selectedPost.type_severity || 3)}
                  </Text>
                </View>
              </View>

              <Text style={styles.popupTitle} numberOfLines={2}>{selectedPost.title}</Text>

              {!!selectedPost.town && (
                <View style={styles.popupLocRow}>
                  <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                  <Text style={styles.popupLocText}>{selectedPost.town}</Text>
                </View>
              )}

              {userLocation && (
                <View style={styles.popupLocRow}>
                  <Ionicons name="navigate-outline" size={13} color={colors.mutedForeground} />
                  <Text style={styles.popupLocText}>
                    {(haversineMeters(
                      userLocation.latitude, userLocation.longitude,
                      selectedPost.lat, selectedPost.lng
                    ) / 1000).toFixed(1)} km away
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.viewBtn} onPress={handleViewDetails}>
                <Text style={styles.viewBtnText}>View Incident</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Empty state */}
        {!loading && visiblePosts.length === 0 && (
          <View style={styles.emptyState} pointerEvents="none">
            <Ionicons name="map-outline" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyStateTitle}>No incidents in your area</Text>
            <Text style={styles.emptyStateHint}>
              Tap the settings icon to change your view radius
            </Text>
          </View>
        )}
      </View>

      {/* ── Radius Picker Modal ── */}
      <Modal
        visible={showRadiusPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRadiusPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowRadiusPicker(false)}
        >
          <View style={styles.radiusSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Adjust View Radius</Text>
            <Text style={styles.sheetSubtitle}>
              By default all verified incidents are shown. Select a radius to only show incidents near you.
            </Text>
            <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {RADIUS_OPTIONS.map(opt => {
                const active = viewRadius === opt.value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[styles.radiusRow, active && styles.radiusRowActive]}
                    onPress={() => { setViewRadius(opt.value); setShowRadiusPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radiusRowLeft}>
                      <Ionicons
                        name={opt.value === null ? 'shield-checkmark-outline' : 'radio-outline'}
                        size={18}
                        color={active ? colors.primary : colors.mutedForeground}
                      />
                      <Text style={[styles.radiusRowLabel, active && styles.radiusRowLabelActive]}>
                        {opt.label}
                      </Text>
                      {opt.value === null && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>Default</Text>
                        </View>
                      )}
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo:   { width: 36, height: 36, borderRadius: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '600', color: colors.cardForeground },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge:   { backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  countText:    { fontSize: 12, color: colors.mutedForeground },

  // Map
  mapWrapper:   { flex: 1 },
  map:          { ...StyleSheet.absoluteFillObject },

  // FABs
  fabStack: { position: 'absolute', right: 12, bottom: 100, gap: 10 },
  fab: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 5,
    borderWidth: 1, borderColor: colors.border,
  },

  // Radius pill
  radiusPill: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 3,
  },
  radiusPillText: { fontSize: 12, fontWeight: '500', color: colors.cardForeground },

  // Loading
  loadingOverlay: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },

  // Popup
  popupContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md },
  popup: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
  },
  popupClose:       { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 1 },
  clusterNote:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8, backgroundColor: colors.primary + '12', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  clusterNoteText:  { fontSize: 11, color: colors.primary, fontWeight: '500', flex: 1 },
  popupBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 28 },
  popupTypeBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  popupTypeBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  popupSevBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  popupSevText:     { fontSize: 11, fontWeight: '600' },
  popupTitle:       { fontSize: 15, fontWeight: '700', color: colors.cardForeground, lineHeight: 21, marginBottom: 6 },
  popupLocRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  popupLocText:     { fontSize: 12, color: colors.mutedForeground },
  viewBtn:          { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  viewBtnText:      { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyState: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyStateTitle:  { fontSize: 15, fontWeight: '600', color: colors.mutedForeground },
  emptyStateHint:   { fontSize: 12, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 },

  // Radius sheet
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  radiusSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 40, maxHeight: '70%',
  },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 17, fontWeight: '700', color: colors.cardForeground, marginBottom: 4 },
  sheetSubtitle:  { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  radiusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginVertical: 2,
  },
  radiusRowActive:      { backgroundColor: colors.primary + '12' },
  radiusRowLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radiusRowLabel:       { fontSize: 15, color: colors.cardForeground },
  radiusRowLabelActive: { color: colors.primary, fontWeight: '600' },
  defaultPill:          { backgroundColor: colors.muted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultPillText:      { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },
});
