import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { supportApi } from '../lib/api';

const EMERGENCY_PHONE = '+264816802064';
const EMERGENCY_WHATSAPP = 'https://wa.me/264816802064';

const supportTypes = [
  {
    key: 'emergency',
    label: 'Emergency',
    icon: 'warning-outline' as const,
    color: '#dc2626',
    description: 'Immediate danger or life-threatening situation',
  },
  {
    key: 'counseling',
    label: 'Counseling',
    icon: 'heart-outline' as const,
    color: '#9333ea',
    description: 'Emotional and psychological support',
  },
  {
    key: 'legal',
    label: 'Legal Aid',
    icon: 'shield-outline' as const,
    color: '#2563eb',
    description: 'Legal advice and representation',
  },
  {
    key: 'medical',
    label: 'Medical',
    icon: 'medkit-outline' as const,
    color: '#059669',
    description: 'Medical assistance and referrals',
  },
];

const contactMethods = [
  { key: 'phone', label: 'Phone Call', icon: 'call-outline' as const },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const },
  { key: 'in_app', label: 'In-App Chat', icon: 'chatbubble-outline' as const },
];

export default function CounselingScreen() {
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContact, setSelectedContact] = useState('phone');
  const [submitting, setSubmitting] = useState(false);

  const handleEmergencyCall = useCallback(() => {
    Linking.openURL(`tel:${EMERGENCY_PHONE}`);
  }, []);

  const handleEmergencyWhatsApp = useCallback(() => {
    Linking.openURL(EMERGENCY_WHATSAPP);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) {
      Alert.alert('Required', 'Please select a support type.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe your situation.');
      return;
    }

    if (selectedType === 'emergency') {
      Alert.alert(
        'Emergency',
        'For immediate emergencies, please call directly.',
        [
          { text: 'Call Now', onPress: handleEmergencyCall },
          { text: 'WhatsApp', onPress: handleEmergencyWhatsApp },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      await supportApi.create({
        type: selectedType,
        description: description.trim(),
        contactMethod: selectedContact,
      });
      Alert.alert(
        'Request Submitted',
        'Your support request has been submitted. Our team will contact you soon.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, description, selectedContact, navigation, handleEmergencyCall, handleEmergencyWhatsApp]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Counseling & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.emergencyBanner} onPress={handleEmergencyCall} data-testid="button-emergency-call">
          <View style={styles.emergencyLeft}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="call" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.emergencyTitle}>Emergency Hotline</Text>
              <Text style={styles.emergencyNumber}>{EMERGENCY_PHONE}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.whatsappButton} onPress={handleEmergencyWhatsApp} data-testid="button-emergency-whatsapp">
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What kind of support do you need?</Text>
          <View style={styles.typeGrid}>
            {supportTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeCard,
                  selectedType === type.key && { borderColor: type.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedType(type.key)}
                data-testid={`button-support-${type.key}`}
              >
                <View style={[styles.typeIcon, { backgroundColor: type.color + '15' }]}>
                  <Ionicons name={type.icon} size={24} color={type.color} />
                </View>
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe your situation</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please describe what you're going through. All information is kept confidential."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            data-testid="input-support-description"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred contact method</Text>
          <View style={styles.contactRow}>
            {contactMethods.map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.contactOption,
                  selectedContact === method.key && styles.contactOptionSelected,
                ]}
                onPress={() => setSelectedContact(method.key)}
                data-testid={`button-contact-${method.key}`}
              >
                <Ionicons
                  name={method.icon}
                  size={20}
                  color={selectedContact === method.key ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[
                  styles.contactLabel,
                  selectedContact === method.key && styles.contactLabelSelected,
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          data-testid="button-submit-support"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            All conversations and information shared are strictly confidential. Our team is trained to handle sensitive matters with care and empathy.
          </Text>
        </View>

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
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  emergencyNumber: {
    fontSize: 13,
    color: '#991b1b',
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.cardForeground,
    minHeight: 120,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  contactOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  contactLabelSelected: {
    color: colors.primaryForeground,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 40,
  },
});
