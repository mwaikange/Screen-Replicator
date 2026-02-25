import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize } from '../lib/theme';
import { casesApi } from '../lib/api';
import { Case, RootStackParamList } from '../lib/types';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: '#fef3c7', text: '#92400e', label: 'Open' },
  in_progress: { bg: '#ede9fe', text: '#6b21a8', label: 'In Progress' },
  closed: { bg: '#dcfce7', text: '#166534', label: 'Closed' },
  archived: { bg: '#f3f4f6', text: '#6b7280', label: 'Archived' },
};

const priorityColors: Record<string, { color: string; label: string }> = {
  low: { color: '#22c55e', label: 'Low' },
  medium: { color: '#f59e0b', label: 'Medium' },
  high: { color: '#ef4444', label: 'High' },
  critical: { color: '#dc2626', label: 'Critical' },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CaseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'CaseDetail'>>();
  const { caseId } = route.params;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'documents'>('details');

  const fetchCase = useCallback(async () => {
    try {
      const response = await casesApi.getById(caseId);
      setCaseData(response.data);
    } catch (error) {
      console.error('Failed to fetch case:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!caseData) return;
    try {
      await casesApi.update(caseData.id, { status: newStatus });
      setCaseData({ ...caseData, status: newStatus as Case['status'] });
      Alert.alert('Updated', `Case status changed to ${statusColors[newStatus]?.label || newStatus}`);
    } catch {
      Alert.alert('Error', 'Failed to update case status.');
    }
  }, [caseData]);

  const handleContactSupport = useCallback(() => {
    const message = `Case ID: ${caseId}\nTitle: ${caseData?.title || 'N/A'}\n\nI need assistance with this case.`;
    Linking.openURL(`https://wa.me/264816802064?text=${encodeURIComponent(message)}`);
  }, [caseId, caseData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!caseData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Case Not Found</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
    );
  }

  const status = statusColors[caseData.status] || statusColors.open;
  const priority = priorityColors[caseData.priority] || priorityColors.medium;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Case Details</Text>
        <TouchableOpacity onPress={handleContactSupport} style={styles.supportButton} data-testid="button-contact-support">
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.caseTitle}>{caseData.title}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
            <View style={styles.priorityBadge}>
              <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
              <Text style={styles.priorityText}>{priority.label} Priority</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{caseData.caseType}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{formatDate(caseData.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(['details', 'evidence', 'documents'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'details' ? 'Details' : tab === 'evidence' ? `Evidence (${caseData.evidence.length})` : `Docs (${caseData.documents.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'details' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{caseData.description || 'No description provided.'}</Text>

            {caseData.assignedTo && (
              <View style={styles.assignedRow}>
                <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.assignedText}>Assigned to: {caseData.assignedTo}</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Update Status</Text>
            <View style={styles.statusActions}>
              {Object.entries(statusColors).map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusActionButton,
                    { borderColor: caseData.status === key ? val.text : colors.border },
                    caseData.status === key && { backgroundColor: val.bg },
                  ]}
                  onPress={() => handleStatusChange(key)}
                  disabled={caseData.status === key}
                >
                  <Text style={[styles.statusActionText, { color: val.text }]}>{val.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'evidence' && (
          <View style={styles.card}>
            {caseData.evidence.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="image-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyTabText}>No evidence attached</Text>
              </View>
            ) : (
              <View style={styles.evidenceGrid}>
                {caseData.evidence.map((e, i) => (
                  <View key={e.id || i} style={styles.evidenceItem}>
                    {e.type === 'image' ? (
                      <Image source={{ uri: e.url }} style={styles.evidenceImage} />
                    ) : (
                      <View style={styles.evidenceFile}>
                        <Ionicons name="document-outline" size={24} color={colors.mutedForeground} />
                      </View>
                    )}
                    <Text style={styles.evidenceLabel} numberOfLines={1}>{e.description || e.type}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={styles.card}>
            {caseData.documents.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="document-text-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyTabText}>No documents attached</Text>
              </View>
            ) : (
              caseData.documents.map((d, i) => (
                <TouchableOpacity key={d.id || i} style={styles.documentRow} onPress={() => Linking.openURL(d.url)}>
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                  <Text style={styles.documentName} numberOfLines={1}>{d.name}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  supportButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleRow: {
    marginBottom: 12,
  },
  caseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  metaRow: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.cardForeground,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignedText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTabText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceItem: {
    width: 100,
    alignItems: 'center',
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  evidenceFile: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 40,
  },
});
