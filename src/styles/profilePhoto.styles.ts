import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeProfilePhotoStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    cameraBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
    },
  });
