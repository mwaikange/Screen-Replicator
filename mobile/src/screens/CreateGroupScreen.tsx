import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { groupsApi } from '../lib/api';

const appLogo = require('../../assets/logo.jpg');

export default function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !area.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setCreating(true);
    try {
      await groupsApi.create({ name: name.trim(), area: area.trim(), isPublic });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.cardForeground} />
          </TouchableOpacity>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Create Group</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Windhoek Neighborhood Watch"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Area / Region Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Windhoek or 061"
              placeholderTextColor={colors.mutedForeground}
              value={area}
              onChangeText={setArea}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>Public Group</Text>
              <Text style={styles.toggleDescription}>
                {isPublic ? 'Anyone can join this group' : 'Members must request to join'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, isPublic && styles.toggleActive]}
              onPress={() => setIsPublic(!isPublic)}
            >
              <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, (!name.trim() || !area.trim() || creating) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || !area.trim() || creating}
        >
          <Ionicons name="add" size={18} color={colors.primaryForeground} />
          <Text style={styles.createButtonText}>
            {creating ? 'Creating...' : 'Create Group'}
          </Text>
        </TouchableOpacity>

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.cardForeground,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDescription: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
