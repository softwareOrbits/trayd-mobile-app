import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/ui';
import { type Theme } from '@/theme';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';

const invite = {
  firstName: 'Daniel',
  name: 'Daniel Quinn',
  role: 'Plumber · Senior',
  company: 'Murphy Construction',
  email: 'daniel@murphycon.ie',
};

const ConfirmInviteScreen = () => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const rows = [
    { label: 'Name', value: invite.name },
    { label: 'Role', value: invite.role },
    { label: 'Company', value: invite.company },
    { label: 'Email', value: invite.email },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Image
          source={require('@assets/images/small_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to Trayd, {invite.firstName}</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleStrong}>{invite.company}</Text>
          {' has invited you to join their crew.'}
        </Text>
      </View>

      <View style={styles.card}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[
              styles.row,
              index < rows.length - 1 ? styles.rowDivider : null,
            ]}
          >
            <Text style={styles.rowLabel}>{row.label.toUpperCase()}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          label="That's me"
          fullWidth
          onPress={() =>
            navigation.navigate('CreatePassword', {
              email: invite.email,
              mode: 'onboard',
            })
          }
        />
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.signoutLink}
          hitSlop={8}
        >
          <Text style={styles.signoutText}>Not me — sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 86, height: 63, marginBottom: 16 },
    title: { ...titleStyles, textAlign: 'center' },
    subtitle: subtitleStyles,
    subtitleStrong: { fontFamily: theme.fonts.bold, color: theme.colors.black },
    card: {
      marginTop: 28,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 1,
    },
    rowValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      flexShrink: 1,
      textAlign: 'right',
    },
    footer: { marginTop: 'auto', gap: 18, alignItems: 'center' },
    signoutLink: { paddingVertical: 4 },
    signoutText: linkTextStyles,
  });

export default ConfirmInviteScreen;
