import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { devicesApi } from '../lib/api';
import { TrackedDevice } from '../lib/types';

const deviceStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#dcfce7', text: '#166534', label: 'Active' },
  lost: { bg: '#fef3c7', text: '#92400e', label: 'Lost' },
  stolen: { bg: '#fee2e2', text: '#991b1b', label: 'Stolen' },
  recovered: { bg: '#dbeafe', text: '#1e40af', label: 'Recovered' },
};

const deviceTypeIcons: Record<string, string> = {
  phone: 'phone-portrait-outline',
  tablet: 'tablet-portrait-outline',
  laptop: 'laptop-outline',
  other: 'hardware-chip-outline',
};

function DeviceCard({ device, onStatusChange }: { device: TrackedDevice; onStatusChange: (id: string, status: string) => void }) {
  const status = deviceStatusColors[device.status] || deviceStatusColors.active;
  const icon = deviceTypeIcons[device.deviceType] || deviceTypeIcons.other;

  return (
    <View style={styles.deviceCard} data-testid={`card-device-${device.id}`}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceIcon}>
          <Ionicons name={icon as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.deviceName}</Text>
          <Text style={styles.deviceType}>{device.deviceType} {device.imei ? `• IMEI: ${device.imei}` : ''}</Text>
        </View>
        <View style={[styles.deviceStatusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.deviceStatusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {device.lastSeen && (
        <View style={styles.lastSeenRow}>
          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.lastSeenText}>Last seen: {new Date(device.lastSeen).toLocaleString()}</Text>
        </View>
      )}

      <View style={styles.deviceActions}>
        {device.status === 'active' && (
          <>
            <TouchableOpacity
              style={[styles.deviceActionBtn, { borderColor: '#f59e0b' }]}
              onPress={() => onStatusChange(device.id, 'lost')}
            >
              <Text style={[styles.deviceActionText, { color: '#f59e0b' }]}>Report Lost</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deviceActionBtn, { borderColor: colors.destructive }]}
              onPress={() => onStatusChange(device.id, 'stolen')}
            >
              <Text style={[styles.deviceActionText, { color: colors.destructive }]}>Report Stolen</Text>
            </TouchableOpacity>
          </>
        )}
        {(device.status === 'lost' || device.status === 'stolen') && (
          <TouchableOpacity
            style={[styles.deviceActionBtn, { borderColor: colors.success }]}
            onPress={() => onStatusChange(device.id, 'recovered')}
          >
            <Text style={[styles.deviceActionText, { color: colors.success }]}>Mark Recovered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function DeviceTrackingScreen() {
  const navigation = useNavigation<any>();
  const [devices, setDevices] = useState<TrackedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('phone');
  const [newDeviceImei, setNewDeviceImei] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await devicesApi.getAll();
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleAddDevice = useCallback(async () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Required', 'Please enter a device name.');
      return;
    }

    setAdding(true);
    try {
      await devicesApi.register({
        deviceName: newDeviceName.trim(),
        deviceType: newDeviceType,
        imei: newDeviceImei.trim(),
      });
      setShowAddModal(false);
      setNewDeviceName('');
      setNewDeviceImei('');
      fetchDevices();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to register device.');
    } finally {
      setAdding(false);
    }
  }, [newDeviceName, newDeviceType, newDeviceImei, fetchDevices]);

  const handleStatusChange = useCallback(async (deviceId: string, newStatus: string) => {
    const statusLabel = deviceStatusColors[newStatus]?.label || newStatus;
    Alert.alert(
      'Confirm',
      `Mark this device as ${statusLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await devicesApi.updateStatus(deviceId, newStatus);
              fetchDevices();
            } catch {
              Alert.alert('Error', 'Failed to update device status.');
            }
          },
        },
      ]
    );
  }, [fetchDevices]);

  const deviceTypes = [
    { key: 'phone', label: 'Phone', icon: 'phone-portrait-outline' },
    { key: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' },
    { key: 'laptop', label: 'Laptop', icon: 'laptop-outline' },
    { key: 'other', label: 'Other', icon: 'hardware-chip-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Tracking</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton} data-testid="button-add-device">
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={devices}
          renderItem={({ item }) => (
            <DeviceCard device={item} onStatusChange={handleStatusChange} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No Devices Registered</Text>
              <Text style={styles.emptyText}>Register your devices to track and protect them</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyButtonText}>Register Device</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Device</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Device Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. My iPhone 15"
              placeholderTextColor={colors.mutedForeground}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
              data-testid="input-device-name"
            />

            <Text style={styles.fieldLabel}>Device Type</Text>
            <View style={styles.deviceTypeRow}>
              {deviceTypes.map((dt) => (
                <TouchableOpacity
                  key={dt.key}
                  style={[styles.deviceTypeOption, newDeviceType === dt.key && styles.deviceTypeSelected]}
                  onPress={() => setNewDeviceType(dt.key)}
                >
                  <Ionicons
                    name={dt.icon as any}
                    size={20}
                    color={newDeviceType === dt.key ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text style={[styles.deviceTypeLabel, newDeviceType === dt.key && styles.deviceTypeLabelSelected]}>
                    {dt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>IMEI Number (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter IMEI number"
              placeholderTextColor={colors.mutedForeground}
              value={newDeviceImei}
              onChangeText={setNewDeviceImei}
              keyboardType="numeric"
              data-testid="input-device-imei"
            />

            <TouchableOpacity
              style={[styles.registerButton, adding && styles.registerButtonDisabled]}
              onPress={handleAddDevice}
              disabled={adding}
              data-testid="button-register-device"
            >
              {adding ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={styles.registerButtonText}>Register Device</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  deviceCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  deviceType: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  deviceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deviceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lastSeenText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  deviceActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  deviceActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.cardForeground,
  },
  deviceTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deviceTypeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  deviceTypeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceTypeLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  deviceTypeLabelSelected: {
    color: colors.primaryForeground,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
});
