import { Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeNewLeaveStyles } from '@/styles/leave.styles';
import type { LeaveTypeOption } from '@/services/leave';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_TAGLINE,
  type LeaveType,
} from '@/types';

const DEFAULT_OPTIONS: LeaveTypeOption[] = LEAVE_TYPES.map(type => ({
  type,
  name: LEAVE_TYPE_LABEL[type],
  tagline: LEAVE_TYPE_TAGLINE[type],
}));

type LeaveTypePickerProps = {
  value: LeaveType;
  onChange: (type: LeaveType) => void;
  options?: LeaveTypeOption[];
};

export const LeaveTypePicker = ({
  value,
  onChange,
  options,
}: LeaveTypePickerProps) => {
  const styles = useThemedStyles(makeNewLeaveStyles);
  const list = options?.length ? options : DEFAULT_OPTIONS;

  return (
    <View style={styles.typeGrid}>
      {list.map(option => {
        const active = option.type === value;
        return (
          <Pressable
            key={option.type}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.typeCard, active && styles.typeCardActive]}
            onPress={() => onChange(option.type)}
          >
            <Text style={[styles.typeName, active && styles.typeNameActive]}>
              {option.name}
            </Text>
            <Text style={[styles.typeTag, active && styles.typeTagActive]}>
              {option.tagline}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default LeaveTypePicker;
