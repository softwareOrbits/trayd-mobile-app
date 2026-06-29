type Backable = {
  canGoBack: () => boolean;
  goBack: () => void;
};

export function goBackSafe(navigation: Backable): void {
  if (navigation.canGoBack()) navigation.goBack();
}
