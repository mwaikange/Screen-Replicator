import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import NotificationBell from '../components/NotificationBell';
import { colors, spacing, fontSize } from '../lib/theme';
import { groupsApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Group } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

export default function GroupsScreen() {
  const navigation = useNavigation<any>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [reportedGroups, setReportedGroups] = useState<Set<string>>(new Set());

  const fetchGroups = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData?.user?.id || null);
      const response = await groupsApi.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (!initialLoaded) setInitialLoaded(true);
    }
  };

  useEffect(() => {
    fetchGroups(false);
  }, []);

  // FIX: silent refresh on re-focus — no blank flash
  useFocusEffect(
    useCallback(() => {
      if (initialLoaded) fetchGroups(true);
    }, [initialLoaded])
  );

  const handleReport = async (group: Group) => {
    Alert.alert(
      'Report this group?',
      'Are you sure you want to report this group? This action cannot be undone and will be reviewed by moderators.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Group',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await groupsApi.reportGroup(group.id);
              if (res.data?.alreadyReported) {
                Alert.alert('Already Reported', 'You have already reported this group.');
                return;
              }
              setReportedGroups(prev => new Set([...prev, group.id]));
              Alert.alert('Reported', 'Your report has been submitted.');
            } catch {
              Alert.alert('Error', 'Failed to submit report.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups(true);
  };

  const handleJoin = async (group: Group) => {
    try {
      const res = await groupsApi.join(group.id);
      if (res.data.status === 'joined' || res.data.status === 'already_member') {
        // Public group joined → go straight into chat
        navigation.navigate('GroupChat', { groupId: group.id });
      } else if (res.data.status === 'requested') {
        // Private group → stay on this screen, show confirmation
        Alert.alert(
          'Request Sent',
          'Your join request has been sent to the group creator. You will be notified when it is approved.'
        );
        fetchGroups(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to process your request. Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Community Groups</Text>
        </View>
        <NotificationBell />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.titleSection}>
          <View style={styles.titleLeft}>
            <Text style={styles.sectionTitle}>Your Communities</Text>
            <Text style={styles.sectionSubtitle}>
              Join local groups for better coordination
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Ionicons name="add" size={16} color={colors.primaryForeground} />
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>

        {loading && !initialLoaded ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={currentUserId}
              onOpen={() => navigation.navigate('GroupChat', { groupId: group.id })}
              onJoin={() => handleJoin(group)}
              onReport={() => handleReport(group)}
              hasReported={reportedGroups.has(group.id)}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No groups yet. Create one to get started!</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({
  group,
  currentUserId,
  onOpen,
  onJoin,
  onReport,
  hasReported,
}: {
  group: Group;
  currentUserId: string | null;
  onOpen: () => void;
  onJoin: () => void;
  onReport: () => void;
  hasReported: boolean;
}) {
  // FIX: creator check uses BOTH createdBy field AND isMember flag
  const isCreator = !!(currentUserId && group.createdBy === currentUserId);
  // FIX: creator is always also a member — so Open Group shows for creator too
  const isMember = group.isMember || isCreator;
  const isPending = group.requestPending;

  // Button logic — matches web app exactly:
  // - Member or Creator   → "Open Group"     (blue, filled)
  // - Request Pending     → "Request Pending" (grey, disabled)
  // - Public non-member   → "Join Group"      (blue, filled)
  // - Private non-member  → "Request to Join" (white, outlined with lock icon)
  const getButtonConfig = () => {
    if (isMember) {
      return {
        label: 'Open Group',
        icon: 'chatbubble-outline' as const,
        style: styles.actionButtonPrimary,
        textStyle: styles.actionButtonTextPrimary,
        iconColor: colors.primaryForeground,
        action: onOpen,
        disabled: false,
      };
    }
    if (isPending) {
      return {
        label: 'Request Pending',
        icon: 'time-outline' as const,
        style: styles.actionButtonDisabled,
        textStyle: styles.actionButtonTextDisabled,
        iconColor: colors.mutedForeground,
        action: () => {},
        disabled: true,
      };
    }
    if (group.isPublic) {
      return {
        label: 'Join Group',
        icon: 'people-outline' as const,
        style: styles.actionButtonPrimary,
        textStyle: styles.actionButtonTextPrimary,
        iconColor: colors.primaryForeground,
        action: onJoin,
        disabled: false,
      };
    }
    // Private group — outline style with lock icon (matches web)
    return {
      label: 'Request to Join',
      icon: 'lock-closed-outline' as const,
      style: styles.actionButtonOutline,
      textStyle: styles.actionButtonTextOutline,
      iconColor: colors.cardForeground,
      action: onJoin,
      disabled: false,
    };
  };

  const btn = getButtonConfig();

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupNameRow}>
        <Text style={styles.groupName}>{group.name}</Text>
        {isCreator && (
          <View style={styles.creatorBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#ea580c" />
            <Text style={styles.creatorBadgeText}>Creator</Text>
          </View>
        )}
        {isMember && !isCreator && (
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
            <Text style={styles.memberBadgeText}>Member</Text>
          </View>
        )}
      </View>

      <View style={styles.groupMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.metaText}>Area: {group.area}</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons
            name={group.isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={12}
            color={colors.cardForeground}
          />
          <Text style={styles.badgeText}>{group.isPublic ? 'Public' : 'Private'}</Text>
        </View>
      </View>

      <View style={styles.memberInfoRow}>
        <View style={styles.memberInfo}>
          <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.memberText}>{group.memberCount} members</Text>
        </View>
        {isMember && (
          <TouchableOpacity style={styles.reportButton} onPress={onReport} disabled={hasReported}>
            <Ionicons
              name={hasReported ? 'flag' : 'flag-outline'}
              size={14}
              color={hasReported ? colors.destructive : colors.mutedForeground}
            />
            <Text style={[styles.reportButtonText, hasReported && { color: colors.destructive }]}>
              {hasReported ? 'Reported' : 'Report'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={btn.style} onPress={btn.action} disabled={btn.disabled}>
        <Ionicons name={btn.icon} size={16} color={btn.iconColor} />
        <Text style={btn.textStyle}>{btn.label}</Text>
      </TouchableOpacity>
    </View>
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: spacing.md,
  },
  titleLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 6,
  },
  createButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    flex: 1,
    marginRight: 8,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  creatorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportButtonText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  // Blue filled button (Open Group / Join Group)
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
  },
  actionButtonTextPrimary: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  // White outlined button (Request to Join — private groups)
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
  },
  actionButtonTextOutline: {
    color: colors.cardForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  // Grey disabled button (Request Pending)
  actionButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.muted,
    borderRadius: 6,
    paddingVertical: 12,
    opacity: 0.7,
  },
  actionButtonTextDisabled: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  bottomSpacing: {
    height: 80,
  },
});
