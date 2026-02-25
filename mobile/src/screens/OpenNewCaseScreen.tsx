import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize } from '../lib/theme';
import { casesApi } from '../lib/api';

const caseTypes = [
  { key: 'theft', label: 'Theft', icon: 'lock-closed-outline' as const },
  { key: 'assault', label: 'Assault', icon: 'alert-circle-outline' as const },
  { key: 'fraud', label: 'Fraud', icon: 'document-text-outline' as const },
  { key: 'missing_person', label: 'Missing Person', icon: 'search-outline' as const },
  { key: 'property_damage', label: 'Property Damage', icon: 'home-outline' as const },
  { key: 'cybercrime', label: 'Cybercrime', icon: 'globe-outline' as const },
  { key: 'domestic_violence', label: 'Domestic Violence', icon: 'shield-outline' as const },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

const priorityOptions = [
  { key: 'low', label: 'Low', color: '#22c55e' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
  { key: 'critical', label: 'Critical', color: '#dc2626' },
];

export default function OpenNewCaseScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a case title.');
      return;
    }
    if (!selectedType) {
      Alert.alert('Required', 'Please select a case type.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description.');
      return;
    }

    setSubmitting(true);
    try {
      await casesApi.create({
        title: title.trim(),
        description: description.trim(),
        caseType: selectedType,
        priority: selectedPriority,
        images,
      });
      Alert.alert('Success', 'Your case has been opened successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, selectedType, selectedPriority, images, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open New Case</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Case Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter case title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            data-testid="input-case-title"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Case Type</Text>
          <View style={styles.typeGrid}>
            {caseTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeOption, selectedType === type.key && styles.typeOptionSelected]}
                onPress={() => setSelectedType(type.key)}
                data-testid={`button-type-${type.key}`}
              >
                <Ionicons
                  name={type.icon}
                  size={20}
                  color={selectedType === type.key ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[styles.typeLabel, selectedType === type.key && styles.typeLabelSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.priorityRow}>
            {priorityOptions.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.priorityOption,
                  selectedPriority === p.key && { borderColor: p.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedPriority(p.key)}
                data-testid={`button-priority-${p.key}`}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                <Text style={[
                  styles.priorityLabel,
                  selectedPriority === p.key && { color: colors.cardForeground, fontWeight: '600' },
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the case in detail..."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            data-testid="input-case-description"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence (Photos)</Text>
          <View style={styles.imageGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={handlePickImage} data-testid="button-add-evidence">
              <Ionicons name="camera-outline" size={24} color={colors.mutedForeground} />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          data-testid="button-submit-case"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Case</Text>
          )}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.cardForeground,
    minHeight: 48,
  },
  textArea: {
    minHeight: 120,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  typeLabelSelected: {
    color: colors.primaryForeground,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  addImageText: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  bottomSpacing: {
    height: 40,
  },
});
