import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../lib/theme';
import { PAYSME_NAMIBIAN_TOWNS } from '../lib/paysme';

export default function TownSelector({ value, onChange }: { value: string; onChange: (town: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const towns = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [...PAYSME_NAMIBIAN_TOWNS];
    return PAYSME_NAMIBIAN_TOWNS.filter((town) => town.toLocaleLowerCase().includes(query));
  }, [search]);

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={[styles.selectorText, !value && styles.placeholder]}>{value || 'Select town'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Town</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search PaySME towns"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <FlatList
              data={towns}
              keyExtractor={(town) => town}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.townRow, item === value && styles.selectedRow]}
                  onPress={() => {
                    onChange(item);
                    setSearch('');
                    setVisible(false);
                  }}
                >
                  <Text style={styles.townText}>{item}</Text>
                  {item === value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  selectorText: { fontSize: fontSize.base, color: colors.cardForeground },
  placeholder: { color: colors.mutedForeground },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    height: '72%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.cardForeground },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  townRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedRow: { backgroundColor: '#1d9bf010' },
  townText: { fontSize: fontSize.base, color: colors.cardForeground },
});
