import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { ONB } from './onboarding.styles';

export const makeProfilePhotoStyles = (_theme: Theme) =>
  StyleSheet.create({
    avatar: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: ONB.paper,
      borderWidth: 1.5,
      borderColor: ONB.navy,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
  });
