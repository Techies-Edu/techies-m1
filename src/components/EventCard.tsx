/**
 * EventCard — Neo-Brutalist Card displaying Techies Events with registration status.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { TechiesEvent, RegistrationStatus } from '../types/EventTypes';
import { useTheme, typography, spacing } from '../theme';

interface EventCardProps {
  event: TechiesEvent;
  registrationStatus?: RegistrationStatus;
  onPress: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  registrationStatus = 'Not Registered',
  onPress,
}) => {
  const { colors } = useTheme();

  const getStatusColor = (status: RegistrationStatus) => {
    switch (status) {
      case 'Approved':
        return colors.green;
      case 'Checked In':
        return colors.purple;
      case 'Pending':
        return colors.yellow;
      case 'Rejected':
      case 'Cancelled':
        return colors.error;
      default:
        return colors.surface;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.black,
          shadowColor: colors.black,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {!!event.bannerUrl && (
        <Image
          source={{ uri: event.bannerUrl }}
          style={[styles.banner, { borderColor: colors.black }]}
        />
      )}

      <View style={styles.content}>
        <View style={styles.cardHeader}>
          <View
            style={[styles.themeTag, { backgroundColor: colors.blue, borderColor: colors.black }]}
          >
            <Text style={styles.themeTagText}>{event.theme || 'Tech Event'}</Text>
          </View>

          {registrationStatus !== 'Not Registered' && (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(registrationStatus),
                  borderColor: colors.black,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: colors.black }]}>
                {registrationStatus === 'Approved' && '✅ Approved'}
                {registrationStatus === 'Checked In' && '🎟️ Checked In'}
                {registrationStatus === 'Pending' && '⏳ Pending Approval'}
                {registrationStatus === 'Rejected' && '❌ Rejected'}
                {registrationStatus === 'Cancelled' && '🚫 Cancelled'}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{event.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            📅 {event.date} • ⏰ {event.startTime || '10:00 AM'}
          </Text>
          <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
            📍 {event.venue}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.organizer, { color: colors.textSecondary }]}>
            By {event.organizerName}
          </Text>
          <Text style={[styles.capacity, { color: colors.textPrimary }]}>
            👥 Max {event.capacity} Attendees
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.radiusXl,
    borderWidth: 2.5,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  banner: {
    width: '100%',
    height: 120,
    borderBottomWidth: 2,
  },
  content: {
    padding: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  themeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  themeTagText: {
    fontSize: typography.xs - 1,
    fontWeight: typography.extrabold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  statusText: {
    fontSize: typography.xs - 1,
    fontWeight: typography.extrabold,
  },
  title: {
    fontSize: typography.base + 2,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.xs + 1,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  metaContainer: {
    gap: 2,
    marginBottom: spacing.md,
  },
  metaText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingTop: spacing.xs + 2,
  },
  organizer: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  capacity: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
  },
});
