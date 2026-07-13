import { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveDropdownStyles } from '@/styles/leave.styles';

export type DropdownOption = { key: string; label: string; count?: number };

type Anchor = { x: number; y: number; width: number; height: number };

type LeaveDropdownProps = {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (key: string) => void;
};

const GAP = 8;

export const LeaveDropdown = ({
  label,
  value,
  options,
  onChange,
}: LeaveDropdownProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveDropdownStyles);

  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.key === value) ?? options[0];

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPanelHeight(0);
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };
  const close = () => setOpen(false);

  const screenH = Dimensions.get('window').height;
  const belowTop = anchor ? anchor.y + anchor.height + GAP : 0;
  const spaceBelow = anchor ? screenH - belowTop : 0;
  const flip =
    anchor != null &&
    panelHeight > 0 &&
    spaceBelow < panelHeight &&
    anchor.y > spaceBelow;
  const panelTop = flip
    ? Math.max(GAP, (anchor?.y ?? 0) - panelHeight - GAP)
    : belowTop;
  const panelOpacity = panelHeight > 0 ? 1 : 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        ref={triggerRef}
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => (open ? close() : openMenu())}
      >
        <Text style={styles.triggerLabel}>{label}</Text>
        <View style={styles.triggerValueRow}>
          <Text style={styles.triggerValue} numberOfLines={1}>
            {selected?.label}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close} />
        {anchor ? (
          <View
            onLayout={(e: LayoutChangeEvent) =>
              setPanelHeight(e.nativeEvent.layout.height)
            }
            style={[
              styles.panel,
              {
                top: panelTop,
                left: anchor.x,
                width: anchor.width,
                opacity: panelOpacity,
              },
            ]}
          >
            {options.map(o => {
              const active = o.key === selected?.key;
              return (
                <Pressable
                  key={o.key}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(o.key);
                    close();
                  }}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      active && styles.optionLabelActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                  {o.count != null ? (
                    <Text
                      style={[
                        styles.optionCount,
                        active && styles.optionCountActive,
                      ]}
                    >
                      {o.count}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </View>
  );
};

export default LeaveDropdown;
