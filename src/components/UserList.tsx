/**
 * UserList — Neo-Brutalist FlatList wrapper for nearby professionals with dynamic theme support.
 */
import React from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NearbyUser } from '../types/ProfileTypes';
import { UserCard } from './UserCard';
import { useTheme, typography, spacing } from '../theme';

interface Props {
  users: NearbyUser[];
  onUserPress: (deviceId: string) => void;
  isScanning: boolean;
}

export const UserList: React.FC<Props> = ({ users, onUserPress, isScanning }) => {
  const { colors } = useTheme();

  if (users.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyBadge,
            {
              backgroundColor: colors.yellow,
              borderColor: colors.black,
              shadowColor: colors.black,
            },
          ]}
        >
          <Text style={styles.emptyIcon}>📡</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {isScanning ? 'Looking for professionals nearby…' : 'No one nearby yet'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Keep the app open. Nearby MeshConnect users will appear here automatically.
        </Text>
        {isScanning && (
          <ActivityIndicator style={styles.spinner} color={colors.textPrimary} size="small" />
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.deviceId}
      renderItem={({ item }) => <UserCard user={item} onPress={onUserPress} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      getItemLayout={(_, index) => ({ length: 130, offset: 130 * index, index })}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  emptyBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: typography.lg + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    textAlign: 'center',
    lineHeight: 21,
  },
  spinner: {
    marginTop: spacing.lg,
  },
});
