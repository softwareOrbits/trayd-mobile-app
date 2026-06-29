import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

try {
  messaging().setBackgroundMessageHandler(async () => {});
} catch (e) {
  console.warn('push: background handler unavailable', e);
}

AppRegistry.registerComponent(appName, () => App);
