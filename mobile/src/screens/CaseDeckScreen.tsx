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
  open:     { bg: '#fef3c7', text: '#92400e',  label: 'Open' },
  pending:  { bg: '#eff6ff', text: '#1d4ed8',  label: 'Pending' },
  active:   { bg: '#ede9fe', text: '#6b21a8',  label: 'Active' },
  resolved: { bg: '#dcfce7', text: '#166534',  label: 'Resolved' },
  rejected: { bg: '#fee2e2', text: '#991b1b',  label: 'Rejected' },
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
    <TouchableOpacity style={styles.caseCard} onPress={onPress} activeOpacity={0.7}>
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

  // FIX: three distinct states:
  //   null  = still checking (show spinner)
  //   true  = confirmed active subscription (show cases)
  //   false = confirmed NO subscription (show subscribe prompt)
  //   'error' = network/auth failure (show retry — NEVER redirect on error)
  const [subscriptionState, setSubscriptionState] = useState<boolean | null | 'error'>(null);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in at all — go to login, not subscribe
        navigation.replace('Login');
        return false;
      }

      // FIX: use casesApi.checkAccess() which has the correct query
      // (status=active AND expires_at > now) — same logic ProfileScreen uses
      const hasAccess = await casesApi.checkAccess();

      if (hasAccess) {
        setSubscriptionState(true);
        return true;
      } else {
        // FIX: only redirect when we CONFIRM no subscription — not on error
        setSubscriptionState(false);
        navigation.replace('Subscribe');
        return false;
      }
    } catch (error) {
      // FIX: network error or Supabase error → show retry, NEVER redirect
      console.error('Subscription check error:', error);
      setSubscriptionState('error');
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
    checkSubscription().then((ok) => {
      if (ok) fetchCases();
      else setLoading(false);
    });
  }, [checkSubscription, fetchCases]);

  // FIX: re-check on focus (e.g. user just came back from SubscribeScreen after paying)
  useFocusEffect(
    useCallback(() => {
      checkSubscription().then((ok) => {
        if (ok) fetchCases();
      });
    }, [checkSubscription, fetchCases])
  );

  const filteredCases = activeFilter === 'all'
    ? cases
    : cases.filter(c => c.status === activeFilter);

  const filterTabs = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'active',   label: 'Active' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const renderContent = () => {
    // Still checking subscription
    if (subscriptionState === null) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    // Network/auth error — show retry (do NOT redirect)
    if (subscriptionState === 'error') {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.errorText}>Could not verify subscription</Text>
          <Text style={styles.errorSubText}>Please check your connection and try again</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setSubscriptionState(null);
              setLoading(true);
              checkSubscription().then((ok) => {
                if (ok) fetchCases();
                else setLoading(false);
              });
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Loading cases
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    // Has subscription — show cases list
    return (
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
    );
  };

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
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Device Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Counseling')}
        >
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Counseling</Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
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
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
    marginTop: 12,
  },
  errorSubText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
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
