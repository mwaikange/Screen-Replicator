import { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';

const appLogo = require('../../assets/logo.jpg');

const fallbackIncidentTypes = [
  { value: 'missing_person', label: 'Missing Person' },
  { value: 'incident', label: 'Crime Report' },
  { value: 'alert', label: 'Emergency Alert' },
  { value: 'gender_based_violence', label: 'Gender-Based Violence' },
  { value: 'theft', label: 'Theft' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
];

const stepLabels = ['Type & Location', 'Details & Media', 'Review'];

const Header = memo(function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
    </View>
  );
});

export default function ReportScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [incidentTypes, setIncidentTypes] = useState(fallbackIncidentTypes);
  const [typesLoading, setTypesLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: '',
    town: '',
    latitude: 0,
    longitude: 0,
    radius: 200,
    title: '',
    description: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const result = await postsApi.getIncidentTypes();
        if (result.data && result.data.length > 0) {
          setIncidentTypes(result.data.map((t: any) => ({ value: t.code, label: t.label, id: t.id })));
        }
      } catch {}
      setTypesLoading(false);
    })();
  }, []);

  const canContinueStep1 = formData.type !== '' && formData.town.trim() !== '';
  const canContinueStep2 = formData.title.trim() !== '';

  const handleNext = () => {
    if (step === 1 && !canContinueStep1) {
      Alert.alert('Required Fields', 'Select an incident type and enter your town');
      return;
    }
    if (step === 2 && !canContinueStep2) {
      Alert.alert('Required Field', 'A brief title for the incident is required');
      return;
    }
    Keyboard.dismiss();
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const useCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setFormData(prev => ({ ...prev, latitude: -21.9699, longitude: 16.9028 }));
        setLocationSet(true);
        Alert.alert('Location set', 'Default location used (geolocation unavailable)');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(location.coords.latitude.toFixed(4)),
        longitude: parseFloat(location.coords.longitude.toFixed(4)),
      }));
      setLocationSet(true);
      Alert.alert('Location set', 'Your current location has been captured');
    } catch {
      setFormData(prev => ({ ...prev, latitude: -21.9699, longitude: 16.9028 }));
      setLocationSet(true);
      Alert.alert('Location set', 'Default location used (geolocation unavailable)');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedFiles(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await postsApi.create({ ...formData, images: selectedFiles });
      Alert.alert('Report submitted', 'Your incident has been reported successfully and is now visible in the Feed.', [
        {
          text: 'View Feed',
          onPress: () => {
            setStep(1);
            setFormData({ type: '', town: '', latitude: 0, longitude: 0, radius: 200, title: '', description: '' });
            setSelectedFiles([]);
            setLocationSet(false);
            navigation.navigate('Feed');
          },
        },
      ]);
    } catch {
      Alert.alert('Failed to submit', 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [formData, selectedFiles]);

  const getTypeLabel = (value: string) => incidentTypes.find((t) => t.value === value)?.label || '-';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.stepText}>Step {step} of 3</Text>
          <Text style={styles.stepLabel}>{stepLabels[step - 1]}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>What are you reporting?</Text>
                <Text style={styles.cardSubtitle}>
                  Select the type of incident and set the location
                </Text>

                <Text style={styles.label}>Incident Type</Text>
                <View style={styles.pickerContainer}>
                  {incidentTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.pickerOption,
                        formData.type === type.value && styles.pickerOptionActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    >
                      <View style={[styles.radio, formData.type === type.value && styles.radioActive]}>
                        {formData.type === type.value && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[
                        styles.pickerOptionText,
                        formData.type === type.value && styles.pickerOptionTextActive,
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Town</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter nearest town"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.town}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, town: text }))}
                  autoCapitalize="words"
                />
                <Text style={styles.hint}>Enter the nearest town or city</Text>

                <Text style={styles.label}>Location</Text>
                {locationSet ? (
                  <View>
                    <View style={styles.locationSuccess}>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text style={styles.locationSuccessText}>
                        Location set: {formData.latitude}, {formData.longitude}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={useCurrentLocation}
                      disabled={locationLoading}
                    >
                      <Ionicons name="location-outline" size={16} color={colors.cardForeground} />
                      <Text style={styles.outlineButtonText}>Update Location</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.greenButton}
                    onPress={useCurrentLocation}
                    disabled={locationLoading}
                  >
                    <Ionicons name="location-outline" size={16} color="#ffffff" />
                    <Text style={styles.greenButtonText}>
                      {locationLoading ? 'Getting location...' : 'Use Current Location'}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>Alert Radius (meters)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.radius.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                    setFormData(prev => ({ ...prev, radius: value }));
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={styles.hint}>People within this radius will be notified</Text>

                <TouchableOpacity
                  style={[styles.button, !canContinueStep1 && styles.buttonDisabled]}
                  onPress={handleNext}
                  disabled={!canContinueStep1}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Incident Details</Text>
                <Text style={styles.cardSubtitle}>
                  Provide a clear description and upload photos or videos
                </Text>

                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Brief summary of the incident"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.title}
                  onChangeText={(text) => {
                    if (text.length <= 100) setFormData(prev => ({ ...prev, title: text }));
                  }}
                  maxLength={100}
                />
                <Text style={styles.hint}>{formData.title.length}/100 characters</Text>

                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Provide more details about what happened..."
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.description}
                  onChangeText={(text) => {
                    if (text.length <= 1000) setFormData(prev => ({ ...prev, description: text }));
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.hint}>{formData.description.length}/1000 characters</Text>

                <Text style={styles.label}>Photos & Videos (Optional)</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Ionicons name="cloud-upload-outline" size={16} color={colors.cardForeground} />
                  <Text style={styles.uploadButtonText}>Upload Photos or Videos</Text>
                </TouchableOpacity>

                {selectedFiles.length > 0 && (
                  <View style={styles.fileList}>
                    {selectedFiles.map((file, index) => (
                      <View key={index} style={styles.fileItem}>
                        <View style={styles.fileInfo}>
                          <Ionicons name="document-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.fileName} numberOfLines={1}>File {index + 1}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeFile(index)}>
                          <Ionicons name="close" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.fileRequirements}>
                  <Text style={styles.fileReqTitle}>File Requirements:</Text>
                  <Text style={styles.fileReqText}>Images: JPG, PNG (max 10MB, auto-compressed)</Text>
                  <Text style={styles.fileReqText}>Videos: MP4, MOV (max 25MB)</Text>
                  <Text style={styles.fileReqText}>Multiple files allowed</Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="chevron-back" size={16} color={colors.cardForeground} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { flex: 1 }, !canContinueStep2 && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!canContinueStep2}
                  >
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Review & Submit</Text>
                <Text style={styles.cardSubtitle}>
                  Please review your report before submitting
                </Text>

                <View style={styles.reviewSection}>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Type</Text>
                    <Text style={styles.reviewValue}>{getTypeLabel(formData.type)}</Text>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Title</Text>
                    <Text style={styles.reviewValue}>{formData.title || '-'}</Text>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Description</Text>
                    <Text style={styles.reviewValueSmall}>{formData.description || '-'}</Text>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Media</Text>
                    <View style={styles.reviewRow}>
                      <Ionicons name="document-outline" size={16} color={colors.mutedForeground} />
                      <Text style={styles.reviewValueSmall}>
                        {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) attached` : 'No files attached'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Town</Text>
                    <Text style={styles.reviewValue}>{formData.town || '-'}</Text>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Location</Text>
                    <View style={styles.reviewRow}>
                      <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                      <Text style={styles.reviewValueSmall}>
                        {locationSet ? `${formData.latitude}, ${formData.longitude}` : 'Not set'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Alert Radius</Text>
                    <Text style={styles.reviewValue}>{formData.radius} meters</Text>
                  </View>
                </View>

                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    By submitting this report, you confirm that the information provided is accurate to the best of your knowledge. False reports may result in account suspension.
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={loading}>
                    <Ionicons name="chevron-back" size={16} color={colors.cardForeground} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  stepLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: colors.cardForeground,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  pickerOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pickerOptionText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  locationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  locationSuccessText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#15803d',
  },
  greenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    padding: 12,
  },
  greenButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
  },
  outlineButtonText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  fileList: {
    gap: 8,
    marginTop: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.muted,
    borderRadius: 6,
    padding: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: colors.cardForeground,
    flex: 1,
  },
  fileRequirements: {
    backgroundColor: colors.muted,
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  fileReqTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  fileReqText: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  reviewSection: {
    gap: 16,
  },
  reviewItem: {},
  reviewLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  reviewValueSmall: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    padding: 12,
    marginTop: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 100,
  },
});
