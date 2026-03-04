import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../lib/theme';

type PickerOption = {
  value: string;
  label: string;
  color?: string;
};

type ModalPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: PickerOption[];
  title: string;
  selectedValue?: string;
};

export function ModalPicker({ visible, onClose, onSelect, options, title, selectedValue }: ModalPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <View style={styles.optionLeft}>
                    {item.color && (
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    )}
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            style={styles.optionList}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type SelectorFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
};

export function SelectorField({ label, value, placeholder, onPress }: SelectorFieldProps) {
  return (
    <View>
      <TouchableOpacity style={styles.selectorField} onPress={onPress}>
        <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionList: {
    paddingHorizontal: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary + '10',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    fontSize: 15,
    color: colors.cardForeground,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    minHeight: 44,
  },
  selectorValue: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
