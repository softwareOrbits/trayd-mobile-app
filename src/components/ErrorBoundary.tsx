import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { theme } from '@/theme';

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  message?: string;
};

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const {
      title = 'Something went wrong',
      message = 'This screen hit an unexpected error. Try again — if it keeps happening, restart the app.',
    } = this.props;

    return (
      <View style={styles.root}>
        <View style={styles.icon}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={theme.colors.error}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={this.reset}
        >
          <Ionicons name="refresh" size={18} color={theme.colors.onPrimary} />
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 18,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  message: {
    marginTop: 8,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onPrimary,
  },
});

export default ErrorBoundary;
