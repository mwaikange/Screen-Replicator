import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize } from '../lib/theme';
import { casesApi, userApi } from '../lib/api';
import { Case } from '../lib/types';
import { supabase } from '../lib/supabase';

const appLogo = require('../../assets/logo.jpg');

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: '#fef3c7', text: '#92400e', label: 'Open' },
  in_progress: { bg: '#ede9fe', text: '#6b21a8', label: 'In Progress' },
  closed: { bg: '#dcfce7', text: '#166534', label: 'Closed' },
  archived: { bg: '#f3f4f6', text: '#6b7280', label: 'Archived' },
};

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CaseCard({ caseItem, onPress }: { caseItem: Case; onPress: () => void }) {
  const status = statusColors[caseItem.status] || statusColors.open;
  const priorityColor = priorityColors[caseItem.priority] || priorityColors.medium;

  return (
    <TouchableOpacity style={styles.caseCard} onPress={onPress} activeOpacity={0.7} data-testid={`card-case-${caseItem.id}`}>
      <View style={styles.caseHeader}>
        <View style={styles.caseHeaderLeft}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.caseType}>{caseItem.caseType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.caseTitle} numberOfLines={2}>{caseItem.title}</Text>
      <Text style={styles.caseDescription} numberOfLines={2}>{caseItem.description}</Text>

      <View style={styles.caseFooter}>
        <View style={styles.caseFooterLeft}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.caseDate}>{formatDate(caseItem.createdAt)}</Text>
        </View>
        <View style={styles.caseFooterRight}>
          {caseItem.evidence.length > 0 && (
            <View style={styles.evidenceCount}>
              <Ionicons name="attach-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.evidenceCountText}>{caseItem.evidence.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CaseDeckScreen() {
  const navigation = useNavigation<any>();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigation.replace('Subscribe'); return false; }
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id, status, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!subscription) {
        setHasSubscription(false);
        navigation.replace('Subscribe');
        return false;
      }
      setHasSubscription(true);
      return true;
    } catch (error) {
      console.error('Subscription check error:', error);
      setHasSubscription(null);
      return false;
    }
  }, [navigation]);

  const fetchCases = useCallback(async () => {
    try {
      const response = await casesApi.getAll();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription().then((ok) => { if (ok) fetchCases(); else setLoading(false); });
  }, [checkSubscription, fetchCases]);

  useFocusEffect(
    useCallback(() => {
      checkSubscription().then((ok) => { if (ok) fetchCases(); });
    }, [checkSubscription, fetchCases])
  );

  const filteredCases = activeFilter === 'all'
    ? cases
    : cases.filter(c => c.status === activeFilter);

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'Active' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>My File Deck</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('OpenNewCase')}
          data-testid="button-new-case"
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
              data-testid={`button-filter-${tab.key}`}
            >
              <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DeviceTracking')}
          data-testid="button-device-tracking"
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Device Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Counseling')}
          data-testid="button-counseling"
        >
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Counseling</Text>
        </TouchableOpacity>
      </View>

      {hasSubscription === null ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12, fontSize: 16 }}>Could not verify subscription</Text>
          <TouchableOpacity
            style={{ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
            onPress={() => { setLoading(true); checkSubscription().then((ok) => { if (ok) fetchCases(); else setLoading(false); }); }}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCases}
          renderItem={({ item }) => (
            <CaseCard
              caseItem={item}
              onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
            />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCases(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No Cases Yet</Text>
              <Text style={styles.emptyText}>Open a new case to get started</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('OpenNewCase')}
              >
                <Text style={styles.emptyButtonText}>Open New Case</Text>
              </TouchableOpacity>
            </View>
          }
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 20,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: colors.cardForeground,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  filterTabTextActive: {
    color: colors.card,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  caseCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  caseType: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  caseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  caseDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 12,
  },
  caseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caseDate: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  caseFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evidenceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  evidenceCountText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  bottomSpacing: {
    height: 20,
  },
});
