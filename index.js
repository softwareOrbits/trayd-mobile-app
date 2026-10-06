import 'react-native-gesture-handler';
import { createElement } from 'react';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { name as appName } from './app.json';
import { logConfigReport, validateConfig } from './src/config/validateConfig';
import ConfigErrorScreen from './src/config/ConfigErrorScreen';

const report = validateConfig();
logConfigReport(report);

if (report.ok) {
  try {
    messaging().setBackgroundMessageHandler(async () => {});
  } catch (e) {
    console.warn('push: background handler unavailable', e);
  }
  const App = require('./App').default;
  AppRegistry.registerComponent(appName, () => App);
} else {
  AppRegistry.registerComponent(appName, () => () =>
    createElement(ConfigErrorScreen, { report }),
  );
}
