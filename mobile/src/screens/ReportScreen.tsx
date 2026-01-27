import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { useNavigation } from '@react-navigation/native';

const incidentTypes = [
  { value: 'missing_person', label: 'Missing Person' },
  { value: 'incident', label: 'Incident' },
  { value: 'alert', label: 'Alert' },
];

export default function ReportScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    town: '',
    latitude: 0,
    longitude: 0,
    radius: 200,
    title: '',
    description: '',
  });

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setFormData({
        ...formData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      Alert.alert('Success', 'Location captured');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await postsApi.create(formData);
      Alert.alert('Success', 'Report submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <Ionicons name="eye" size={24} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Report Incident</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.stepText}>Step {step} of 3</Text>
        <Text style={styles.stepLabel}>
          {step === 1 ? 'Type & Location' : step === 2 ? 'Details' : 'Media & Review'}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What are you reporting?</Text>
            <Text style={styles.cardSubtitle}>
              Select the type of incident and set the location
            </Text>

            <Text style={styles.label}>Incident Type</Text>
            <View style={styles.selectContainer}>
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.selectOption,
                    formData.type === type.value && styles.selectOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type: type.value })}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      formData.type === type.value && styles.selectOptionTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Town</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter nearest town"
              placeholderTextColor={colors.mutedForeground}
              value={formData.town}
              onChangeText={(text) => setFormData({ ...formData, town: text })}
            />
            <Text style={styles.hint}>Enter the nearest town or city</Text>

            <Text style={styles.label}>Location</Text>
            <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation}>
              <Ionicons name="location-outline" size={20} color={colors.cardForeground} />
              <Text style={styles.locationButtonText}>Use Current Location</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Alert Radius (meters)</Text>
            <TextInput
              style={styles.input}
              placeholder="200"
              placeholderTextColor={colors.mutedForeground}
              value={formData.radius.toString()}
              onChangeText={(text) => setFormData({ ...formData, radius: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>People within this radius will be notified</Text>

            <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Provide Details</Text>
            <Text style={styles.cardSubtitle}>Describe the incident in detail</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief title for the report"
              placeholderTextColor={colors.mutedForeground}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide detailed information about the incident..."
              placeholderTextColor={colors.mutedForeground}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(1)}>
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Media</Text>
            <Text style={styles.cardSubtitle}>Upload photos or videos (optional)</Text>

            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.cardForeground} />
                <Text style={styles.mediaButtonText}>Upload Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="camera-outline" size={24} color={colors.cardForeground} />
                <Text style={styles.mediaButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Review Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>
                  {incidentTypes.find((t) => t.value === formData.type)?.label || '-'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Town:</Text>
                <Text style={styles.summaryValue}>{formData.town || '-'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Radius:</Text>
                <Text style={styles.summaryValue}>{formData.radius}m</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Title:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {formData.title || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(2)}>
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
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
  progressContainer: {
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  stepText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.cardForeground,
  },
  textArea: {
    minHeight: 120,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  selectContainer: {
    gap: spacing.sm,
  },
  selectOption: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectOptionText: {
    fontSize: fontSize.base,
    color: colors.cardForeground,
  },
  selectOptionTextActive: {
    color: colors.primary,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  locationButtonText: {
    fontSize: fontSize.base,
    color: colors.cardForeground,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  outlineButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineButtonText: {
    color: colors.cardForeground,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  mediaButtonText: {
    fontSize: fontSize.xs,
    color: colors.cardForeground,
  },
  summary: {
    backgroundColor: colors.muted,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  summaryTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
    maxWidth: '60%',
  },
  bottomSpacing: {
    height: 100,
  },
});
