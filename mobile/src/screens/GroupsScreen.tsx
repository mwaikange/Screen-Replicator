import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';
import { groupsApi } from '../lib/api';
import { Group } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

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
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Community Groups</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
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
          <View style={styles.titleLeft}>
            <Text style={styles.sectionTitle}>Your Communities</Text>
            <Text style={styles.sectionSubtitle}>
              Join local groups for better coordination
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={16} color={colors.primaryForeground} />
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>

        {groups.length > 0 ? (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        ) : (
          <>
            <GroupCard
              group={{ id: 's1', name: 'Kudu watchers', area: 'Gobabis', isPublic: true, memberCount: 4, createdBy: '' }}
            />
            <GroupCard
              group={{ id: 's2', name: 'Outjo herero location neighborhood watch', area: '067', isPublic: false, memberCount: 6, createdBy: '' }}
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
        <View style={styles.badge}>
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
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 8,
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
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  memberText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  joinButtonTextOutline: {
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 80,
  },
});
