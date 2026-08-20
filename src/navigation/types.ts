/**
 * Navigation type definitions for Techies Application.
 */

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Profile: { deviceId: string };
  MyProfile: undefined;
  Connections: undefined;
  Events: undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
  Settings: undefined;
  QRScreen: undefined;
  QRScannerScreen: undefined;
};
