import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { supabase } from '../lib/supabase';

type IncidentResult = {
  id: string;
  title: string;
  town: string;
  verification_level: number | null;
  created_at: string;
  incident_types: { label: string; severity: number } | null;
};

type PersonResult = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  trust_score: number;
  level: number;
};

type TabType = 'incidents' | 'people';

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('incidents');
  const [incidents, setIncidents] = useState<IncidentResult[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setIncidents([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [incidentRes, peopleRes] = await Promise.all([
        supabase
          .from('incidents')
          .select('id, title, town, verification_level, created_at, incident_types(label, severity)')
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,town.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url, trust_score, level')
          .ilike('display_name', `%${searchQuery}%`)
          .limit(10),
      ]);

      if (incidentRes.data) setIncidents(incidentRes.data as any as IncidentResult[]);
      if (peopleRes.data) setPeople(peopleRes.data as any as PersonResult[]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(text.trim());
    }, 300);
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleIncidentPress = useCallback((id: string) => {
    navigation.navigate('IncidentDetails', { postId: id });
  }, [navigation]);

  const handlePersonPress = useCallback((id: string) => {
    navigation.navigate('Main', { screen: 'Profile' });
  }, [navigation]);

  const renderIncident = useCallback(({ item }: { item: IncidentResult }) => {
    const severityColor = item.incident_types?.severity
      ? item.incident_types.severity >= 4 ? colors.destructive
        : item.incident_types.severity >= 3 ? colors.warning
        : colors.primary
      : colors.mutedForeground;

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleIncidentPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.severityIndicator, { backgroundColor: severityColor }]} />
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.resultMeta}>
            {item.incident_types && (
              <View style={[styles.typeBadge, { backgroundColor: severityColor + '15' }]}>
                <Text style={[styles.typeBadgeText, { color: severityColor }]}>
                  {item.incident_types.label}
                </Text>
              </View>
            )}
            {item.town && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.locationText}>{item.town}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  }, [handleIncidentPress]);

  const renderPerson = useCallback(({ item }: { item: PersonResult }) => {
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handlePersonPress(item.id)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.personAvatar} />
        ) : (
          <View style={styles.personAvatarFallback}>
            <Text style={styles.personAvatarText}>
              {item.display_name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>{item.display_name}</Text>
          <View style={styles.resultMeta}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Level {item.level}</Text>
            </View>
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.mutedForeground} />
              <Text style={styles.trustText}>Trust: {item.trust_score}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  }, [handlePersonPress]);

  const activeData = activeTab === 'incidents' ? incidents : people;
  const incidentCount = incidents.length;
  const peopleCount = people.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search incidents, people..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setIncidents([]); setPeople([]); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incidents' && styles.tabActive]}
          onPress={() => setActiveTab('incidents')}
        >
          <Text style={[styles.tabText, activeTab === 'incidents' && styles.tabTextActive]}>
            Incidents {incidentCount > 0 ? `(${incidentCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.tabActive]}
          onPress={() => setActiveTab('people')}
        >
          <Text style={[styles.tabText, activeTab === 'people' && styles.tabTextActive]}>
            People {peopleCount > 0 ? `(${peopleCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : query.length < 2 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Search Ngumu's Eye</Text>
          <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'incidents' ? incidents : people) as any[]}
          renderItem={activeTab === 'incidents' ? renderIncident as any : renderPerson as any}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try a different search term</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={<View style={styles.bottomSpacing} />}
        />
      )}
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
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.cardForeground,
    height: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.card,
    gap: 12,
  },
  severityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  personAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  bottomSpacing: {
    height: 40,
  },
});
