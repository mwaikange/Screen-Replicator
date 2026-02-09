import { useState, useCallback, memo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { useNavigation } from '@react-navigation/native';

const appLogo = require('../../assets/logo.jpg');

const incidentTypes = [
  { value: 'missing_person', label: 'Missing Person', icon: 'person-outline' },
  { value: 'incident', label: 'Incident', icon: 'warning-outline' },
  { value: 'alert', label: 'Alert', icon: 'megaphone-outline' },
];

const Header = memo(function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>
      <TouchableOpacity 
        style={styles.notificationButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
    </View>
  );
});

export default function ReportScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: '',
    town: '',
    latitude: 0,
    longitude: 0,
    radius: 200,
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.type) newErrors.type = 'Please select an incident type';
    if (!formData.town.trim()) newErrors.town = 'Please enter a town';
    if (formData.radius < 50 || formData.radius > 5000) {
      newErrors.radius = 'Radius must be between 50 and 5000 meters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateStep2 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Please enter a title';
    if (!formData.description.trim()) newErrors.description = 'Please enter a description';
    if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const useCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to report incidents');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
      Alert.alert('Success', 'Location captured successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
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
      selectionLimit: 5,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await postsApi.create({ ...formData, images });
      Alert.alert('Success', 'Report submitted successfully', [
        { text: 'OK', onPress: () => {
          setStep(1);
          setFormData({
            type: '',
            town: '',
            latitude: 0,
            longitude: 0,
            radius: 200,
            title: '',
            description: '',
          });
          setImages([]);
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, images]);

  const goToStep = useCallback((nextStep: number) => {
    if (nextStep === 2 && !validateStep1()) return;
    if (nextStep === 3 && !validateStep2()) return;
    Keyboard.dismiss();
    setStep(nextStep);
  }, [validateStep1, validateStep2]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <View style={styles.progressContainer}>
        <Text style={styles.stepText}>Step {step} of 3</Text>
        <Text style={styles.stepLabel}>
          {step === 1 ? 'Type & Location' : step === 2 ? 'Details' : 'Media & Review'}
        </Text>
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
            style={styles.content}
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
                <View style={styles.selectContainer}>
                  {incidentTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.selectOption,
                        formData.type === type.value && styles.selectOptionActive,
                        errors.type && styles.selectOptionError,
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, type: type.value }));
                        setErrors(prev => ({ ...prev, type: '' }));
                      }}
                      accessibilityLabel={type.label}
                      accessibilityState={{ selected: formData.type === type.value }}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={formData.type === type.value ? colors.primary : colors.mutedForeground} 
                      />
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
                {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}

                <Text style={styles.label}>Town</Text>
                <TextInput
                  style={[styles.input, errors.town && styles.inputError]}
                  placeholder="Enter nearest town"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.town}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, town: text }));
                    setErrors(prev => ({ ...prev, town: '' }));
                  }}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
                {errors.town ? (
                  <Text style={styles.errorText}>{errors.town}</Text>
                ) : (
                  <Text style={styles.hint}>Enter the nearest town or city</Text>
                )}

                <Text style={styles.label}>Location</Text>
                <TouchableOpacity 
                  style={styles.locationButton} 
                  onPress={useCurrentLocation}
                  disabled={locationLoading}
                  accessibilityLabel="Use current location"
                >
                  <Ionicons 
                    name={formData.latitude ? "checkmark-circle" : "location-outline"} 
                    size={20} 
                    color={formData.latitude ? colors.success : colors.cardForeground} 
                  />
                  <Text style={styles.locationButtonText}>
                    {locationLoading ? 'Getting location...' : 
                     formData.latitude ? 'Location captured' : 'Use Current Location'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Alert Radius (meters)</Text>
                <TextInput
                  style={[styles.input, errors.radius && styles.inputError]}
                  placeholder="200"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.radius.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                    setFormData(prev => ({ ...prev, radius: value }));
                    setErrors(prev => ({ ...prev, radius: '' }));
                  }}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={4}
                />
                {errors.radius ? (
                  <Text style={styles.errorText}>{errors.radius}</Text>
                ) : (
                  <Text style={styles.hint}>People within this radius will be notified (50-5000m)</Text>
                )}

                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => goToStep(2)}
                  accessibilityLabel="Continue to step 2"
                >
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
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="Brief title for the report"
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.title}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, title: text }));
                    setErrors(prev => ({ ...prev, title: '' }));
                  }}
                  returnKeyType="next"
                  maxLength={100}
                />
                {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                  placeholder="Provide detailed information about the incident..."
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, description: text }));
                    setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                {errors.description ? (
                  <Text style={styles.errorText}>{errors.description}</Text>
                ) : (
                  <Text style={styles.hint}>{formData.description.length}/1000 characters</Text>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.outlineButton} 
                    onPress={() => goToStep(1)}
                    accessibilityLabel="Go back to step 1"
                  >
                    <Text style={styles.outlineButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, { flex: 1 }]} 
                    onPress={() => goToStep(3)}
                    accessibilityLabel="Continue to step 3"
                  >
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Add Media</Text>
                <Text style={styles.cardSubtitle}>Upload photos or videos (optional, max 5)</Text>

                <View style={styles.mediaButtons}>
                  <TouchableOpacity 
                    style={styles.mediaButton}
                    onPress={pickImage}
                    accessibilityLabel="Upload photo from gallery"
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.cardForeground} />
                    <Text style={styles.mediaButtonText}>Upload Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.mediaButton}
                    onPress={takePhoto}
                    accessibilityLabel="Take photo with camera"
                  >
                    <Ionicons name="camera-outline" size={24} color={colors.cardForeground} />
                    <Text style={styles.mediaButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {images.length > 0 && (
                  <View style={styles.imagePreviewContainer}>
                    <Text style={styles.imageCount}>{images.length}/5 images added</Text>
                  </View>
                )}

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
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Location:</Text>
                    <Text style={styles.summaryValue}>
                      {formData.latitude ? 'Captured' : 'Not set'}
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.outlineButton} 
                    onPress={() => goToStep(2)}
                    accessibilityLabel="Go back to step 2"
                  >
                    <Text style={styles.outlineButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    accessibilityLabel="Submit report"
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.destructive,
    marginTop: spacing.xs,
  },
  selectContainer: {
    gap: spacing.sm,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 52,
  },
  selectOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectOptionError: {
    borderColor: colors.destructive,
  },
  selectOptionText: {
    fontSize: fontSize.base,
    color: colors.cardForeground,
    marginLeft: spacing.sm,
  },
  selectOptionTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 52,
  },
  locationButtonText: {
    fontSize: fontSize.base,
    color: colors.cardForeground,
    marginLeft: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  outlineButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
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
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 80,
  },
  mediaButtonText: {
    fontSize: fontSize.xs,
    color: colors.cardForeground,
    marginTop: spacing.xs,
  },
  imagePreviewContainer: {
    marginTop: spacing.md,
  },
  imageCount: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
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
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
    maxWidth: '60%',
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 100,
  },
});
