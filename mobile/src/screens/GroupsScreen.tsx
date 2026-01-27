import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';
import { groupsApi } from '../lib/api';
import { Group } from '../lib/types';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = async () => {
    try {
      const response = await groupsApi.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <Ionicons name="eye" size={24} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Community Groups</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.sectionTitle}>Your Communities</Text>
            <Text style={styles.sectionSubtitle}>
              Join local groups for better coordination
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>

        {groups.length > 0 ? (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        ) : (
          <>
            <SampleGroupCard
              name="Kudu watchers"
              area="Gobabis"
              isPublic={true}
              memberCount={4}
            />
            <SampleGroupCard
              name="Outjo herero location neighborhood watch"
              area="067"
              isPublic={false}
              memberCount={6}
            />
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{group.name}</Text>
      <View style={styles.groupMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.metaText}>Area: {group.area}</Text>
        </View>
        <View style={[styles.badge, group.isPublic ? styles.badgePublic : styles.badgePrivate]}>
          <Ionicons
            name={group.isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={12}
            color={colors.cardForeground}
          />
          <Text style={styles.badgeText}>{group.isPublic ? 'Public' : 'Private'}</Text>
        </View>
      </View>
      <View style={styles.memberInfo}>
        <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
        <Text style={styles.memberText}>{group.memberCount} members</Text>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, !group.isPublic && styles.joinButtonOutline]}
      >
        <Text
          style={[styles.joinButtonText, !group.isPublic && styles.joinButtonTextOutline]}
        >
          {group.isPublic ? 'Join Group' : 'Request to Join'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SampleGroupCard({
  name,
  area,
  isPublic,
  memberCount,
}: {
  name: string;
  area: string;
  isPublic: boolean;
  memberCount: number;
}) {
  return (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{name}</Text>
      <View style={styles.groupMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.metaText}>Area: {area}</Text>
        </View>
        <View style={[styles.badge, isPublic ? styles.badgePublic : styles.badgePrivate]}>
          <Ionicons
            name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={12}
            color={colors.cardForeground}
          />
          <Text style={styles.badgeText}>{isPublic ? 'Public' : 'Private'}</Text>
        </View>
      </View>
      <View style={styles.memberInfo}>
        <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
        <Text style={styles.memberText}>{memberCount} members</Text>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, !isPublic && styles.joinButtonOutline]}
      >
        <Text
          style={[styles.joinButtonText, !isPublic && styles.joinButtonTextOutline]}
        >
          {isPublic ? 'Join Group' : 'Request to Join'}
        </Text>
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
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.cardForeground,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgePublic: {
    backgroundColor: colors.muted,
  },
  badgePrivate: {
    backgroundColor: colors.muted,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.cardForeground,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  memberText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  joinButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  joinButtonTextOutline: {
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 80,
  },
});
