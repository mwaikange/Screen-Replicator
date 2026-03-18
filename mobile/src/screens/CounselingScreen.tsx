import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing } from '../lib/theme';
import { supportApi } from '../lib/api';

const EMERGENCY_PHONE = '+264816802064';
const EMERGENCY_WHATSAPP = 'https://wa.me/264816802064';

const supportTypes = [
  { key: 'emergency', label: 'Emergency', icon: 'warning-outline' as const, color: '#dc2626', description: 'Immediate danger or life-threatening situation' },
  { key: 'counseling', label: 'Counseling', icon: 'heart-outline' as const, color: '#9333ea', description: 'Emotional and psychological support' },
  { key: 'legal', label: 'Legal Aid', icon: 'shield-outline' as const, color: '#2563eb', description: 'Legal advice and representation' },
  { key: 'medical', label: 'Medical', icon: 'medkit-outline' as const, color: '#059669', description: 'Medical assistance and referrals' },
];

const contactMethods = [
  { key: 'phone', label: 'Phone Call', icon: 'call-outline' as const },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const },
  { key: 'email', label: 'Email', icon: 'mail-outline' as const },
];

type Attachment = { uri: string; name: string; type: 'image' | 'document' };

export default function CounselingScreen() {
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContact, setSelectedContact] = useState('phone');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleEmergencyCall = useCallback(() => { Linking.openURL(`tel:${EMERGENCY_PHONE}`); }, []);
  const handleEmergencyWhatsApp = useCallback(() => { Linking.openURL(EMERGENCY_WHATSAPP); }, []);

  const handleAddPhoto = useCallback(async () => {
    if (attachments.length >= 3) { Alert.alert('Limit reached', 'You can attach up to 3 files.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please grant photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachments(prev => [...prev, { uri: asset.uri, name: asset.uri.split('/').pop() || 'photo.jpg', type: 'image' }]);
    }
  }, [attachments]);

  const handleAddDocument = useCallback(async () => {
    if (attachments.length >= 3) { Alert.alert('Limit reached', 'You can attach up to 3 files.'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachments(prev => [...prev, { uri: asset.uri, name: asset.name, type: 'document' }]);
      }
    } catch { Alert.alert('Error', 'Could not open document picker.'); }
  }, [attachments]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) { Alert.alert('Required', 'Please select a support type.'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Please describe your situation.'); return; }
    if (selectedType === 'emergency') {
      Alert.alert('Emergency', 'For immediate emergencies, please call directly.', [
        { text: 'Call Now', onPress: handleEmergencyCall },
        { text: 'WhatsApp', onPress: handleEmergencyWhatsApp },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      await supportApi.create({
        type: selectedType,
        description: description.trim(),
        contactMethod: selectedContact,
        doc1: attachments[0]?.uri || null,
        doc2: attachments[1]?.uri || null,
        doc3: attachments[2]?.uri || null,
      });
      Alert.alert('Request Submitted', 'Your support request has been submitted. Our team will contact you soon.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request.');
    } finally { setSubmitting(false); }
  }, [selectedType, description, selectedContact, attachments, navigation, handleEmergencyCall, handleEmergencyWhatsApp]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Counseling & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.emergencyBanner} onPress={handleEmergencyCall}>
          <View style={styles.emergencyLeft}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="call" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.emergencyTitle}>Emergency Hotline</Text>
              <Text style={styles.emergencyNumber}>{EMERGENCY_PHONE}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.whatsappButton} onPress={handleEmergencyWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What kind of support do you need?</Text>
          <View style={styles.typeGrid}>
            {supportTypes.map((type) => (
              <TouchableOpacity key={type.key}
                style={[styles.typeCard, selectedType === type.key && { borderColor: type.color, borderWidth: 2 }]}
                onPress={() => setSelectedType(type.key)}>
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
          <TextInput style={styles.textArea}
            placeholder="Please describe what you're going through. All information is kept confidential."
            placeholderTextColor={colors.mutedForeground}
            value={description} onChangeText={setDescription}
            multiline numberOfLines={5} textAlignVertical="top" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attach Documents / Photos (up to 3)</Text>
          <View style={styles.attachmentList}>
            {attachments.map((att, index) => (
              <View key={index} style={styles.attachmentItem}>
                {att.type === 'image'
                  ? <Image source={{ uri: att.uri }} style={styles.attachmentImage} />
                  : <View style={styles.attachmentDoc}><Ionicons name="document-outline" size={28} color={colors.primary} /></View>
                }
                <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveAttachment(index)}>
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {attachments.length < 3 && (
            <View style={styles.addAttachmentRow}>
              <TouchableOpacity style={styles.addAttachmentButton} onPress={handleAddPhoto}>
                <Ionicons name="image-outline" size={22} color={colors.primary} />
                <Text style={styles.addAttachmentText}>Add Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addAttachmentButton} onPress={handleAddDocument}>
                <Ionicons name="document-attach-outline" size={22} color={colors.primary} />
                <Text style={styles.addAttachmentText}>Add Document</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.attachmentHint}>{attachments.length}/3 files attached</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred contact method</Text>
          <View style={styles.contactRow}>
            {contactMethods.map((method) => (
              <TouchableOpacity key={method.key}
                style={[styles.contactOption, selectedContact === method.key && styles.contactOptionSelected]}
                onPress={() => setSelectedContact(method.key)}>
                <Ionicons name={method.icon} size={20}
                  color={selectedContact === method.key ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.contactLabel, selectedContact === method.key && styles.contactLabelSelected]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting
            ? <ActivityIndicator size="small" color={colors.primaryForeground} />
            : <Text style={styles.submitButtonText}>Submit Request</Text>
          }
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>All conversations and information shared are strictly confidential. Our team is trained to handle sensitive matters with care and empathy.</Text>
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.cardForeground },
  headerRight: { width: 32 },
  content: { flex: 1, padding: spacing.md },
  emergencyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fee2e2', borderRadius: 12, padding: spacing.md, marginBottom: 20, borderWidth: 1, borderColor: '#fca5a5' },
  emergencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergencyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  emergencyNumber: { fontSize: 13, color: '#991b1b' },
  whatsappButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.cardForeground, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '48%', backgroundColor: colors.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: colors.cardForeground, marginBottom: 2 },
  typeDescription: { fontSize: 11, color: colors.mutedForeground, lineHeight: 16 },
  textArea: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, fontSize: 14, color: colors.cardForeground, minHeight: 120 },
  attachmentList: { gap: 8, marginBottom: 8 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border, gap: 10 },
  attachmentImage: { width: 48, height: 48, borderRadius: 6 },
  attachmentDoc: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  attachmentName: { flex: 1, fontSize: 13, color: colors.cardForeground },
  addAttachmentRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  addAttachmentButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 12 },
  addAttachmentText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  attachmentHint: { fontSize: 11, color: colors.mutedForeground },
  contactRow: { flexDirection: 'row', gap: 8 },
  contactOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  contactOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  contactLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: '500' },
  contactLabelSelected: { color: colors.primaryForeground },
  submitButton: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryForeground },
  infoCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 8, padding: spacing.md, gap: 10, borderWidth: 1, borderColor: colors.border },
  infoText: { flex: 1, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  bottomSpacing: { height: 40 },
});
