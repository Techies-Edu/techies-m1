/**
 * EventDetailScreen — Event Details, Member Registration, and Organizer Management Hub.
 * Provides organizer event editing, publishing, registration approvals, attendee list,
 * BLE check-in, member 1-tap registration, cancellation, website links, and security rules.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import EventService from '../services/event/EventService';
import CheckInService from '../services/event/CheckInService';
import * as ProfileStore from '../services/profile/ProfileStore';
import AuthService from '../services/auth/AuthService';
import {
  TechiesEvent,
  EventRegistration,
  RegistrationStatus,
  EventStatus,
} from '../types/EventTypes';
import { UserProfile } from '../types/ProfileTypes';
import { useTheme, typography, spacing } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'EventDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;

export const EventDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { mode, colors } = useTheme();
  const { eventId } = route.params;

  const [event, setEvent] = useState<TechiesEvent | null>(null);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const [currentUid, setCurrentUid] = useState<string>('');
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [registrationsList, setRegistrationsList] = useState<EventRegistration[]>([]);
  const [attendeeCount, setAttendeeCount] = useState(0);

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isCheckInActive, setIsCheckInActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Organizer Modals State
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editCapacityText, setEditCapacityText] = useState('100');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editCategoriesText, setEditCategoriesText] = useState('');
  const [editTagsText, setEditTagsText] = useState('');
  const [editStatus, setEditStatus] = useState<EventStatus>('PUBLISHED');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const evt = await EventService.getEventById(eventId);
      setEvent(evt);

      const prof = await ProfileStore.getMyProfile();
      setOwnProfile(prof);

      const session = await AuthService.getCurrentSession();
      if (session) {
        setCurrentUid(session.uid);
      }

      if (evt && session) {
        setIsOrganizer(evt.organizerId === session.uid || session.role === 'ORGANIZER');
      }

      const regs = await EventService.getRegistrationsForEvent(eventId);
      setRegistrationsList(regs);

      if (prof) {
        const myReg = regs.find((r) => r.userId === prof.deviceId || r.userId === session?.uid);
        setRegistration(myReg || null);

        const approvedCount = regs.filter(
          (r) => r.status === 'Approved' || r.status === 'Checked In',
        ).length;
        setAttendeeCount(approvedCount);
      }

      const activeSession = await CheckInService.getActiveOrganizerSession();
      setIsCheckInActive(activeSession?.eventId === eventId);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditModal = () => {
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditVenue(event.venue);
    setEditTheme(event.theme);
    setEditDate(event.date);
    setEditStartTime(event.startTime);
    setEditEndTime(event.endTime);
    setEditCapacityText(event.capacity.toString());
    setEditBannerUrl(event.bannerUrl);
    setEditWebsite(event.website || '');
    setEditContact(event.contact || '');
    setEditCategoriesText((event.categories || []).join(', '));
    setEditTagsText((event.tags || []).join(', '));
    setEditStatus(event.eventStatus || 'PUBLISHED');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!event || !currentUid) return;
    setActionLoading(true);

    try {
      const cap = parseInt(editCapacityText, 10) || 50;
      const res = await EventService.updateEvent(currentUid, event.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        venue: editVenue.trim(),
        theme: editTheme.trim(),
        date: editDate.trim(),
        startTime: editStartTime.trim(),
        endTime: editEndTime.trim(),
        capacity: cap,
        bannerUrl: editBannerUrl.trim(),
        website: editWebsite.trim(),
        contact: editContact.trim(),
        eventStatus: editStatus,
        categories: editCategoriesText
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        tags: editTagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });

      if (res.success && res.event) {
        setEvent(res.event);
        setShowEditModal(false);
        Alert.alert('Event Updated', 'Changes saved successfully.');
      } else {
        Alert.alert('Update Failed', res.error || 'Unable to update event.');
      }
    } catch (_) {
      Alert.alert('Error', 'An error occurred while updating the event.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !currentUid) return;

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const res = await EventService.deleteEvent(currentUid, event.id);
            setActionLoading(false);
            if (res.success) {
              Alert.alert('Event Deleted', 'Event has been removed.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', res.error || 'Failed to delete event.');
            }
          },
        },
      ],
    );
  };

  const handleRegister = async () => {
    if (!event || !ownProfile) return;
    setActionLoading(true);

    try {
      const res = await EventService.registerForEvent(event.id, ownProfile);
      if (res.success && res.registration) {
        setRegistration(res.registration);
        Alert.alert(
          'Registration Successful',
          `Status: ${res.registration.status}. ${
            res.registration.status === 'Approved'
              ? 'Your spot is confirmed!'
              : 'The organizer will review your RSVP.'
          }`,
        );
        loadData();
      } else {
        Alert.alert('Registration Failed', res.error || 'Unable to register.');
      }
    } catch (_) {
      Alert.alert('Error', 'An error occurred during registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!event || !currentUid) return;
    setActionLoading(true);

    try {
      const res = await EventService.cancelRegistration(currentUid, event.id);
      if (res.success) {
        Alert.alert('Registration Cancelled', 'Your registration has been cancelled.');
        loadData();
      } else {
        Alert.alert('Cancellation Failed', res.error || 'Unable to cancel registration.');
      }
    } catch (_) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRegStatus = async (regId: string, newStatus: RegistrationStatus) => {
    if (!currentUid) return;
    setActionLoading(true);
    try {
      const res = await EventService.updateRegistrationStatus(currentUid, regId, newStatus);
      if (res.success) {
        loadData();
      } else {
        Alert.alert('Error', res.error || 'Failed to update registration status.');
      }
    } catch (_) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCheckInMode = async () => {
    if (!event || !ownProfile) return;

    if (isCheckInActive) {
      await CheckInService.stopOrganizerCheckInMode();
      setIsCheckInActive(false);
      Alert.alert('Check-In Mode Closed', 'Event check-in mode has been stopped.');
    } else {
      await CheckInService.startOrganizerCheckInMode(event.id, ownProfile.deviceId);
      setIsCheckInActive(true);
      Alert.alert(
        'Organizer BLE Check-In Mode ACTIVE',
        'Nearby registered attendees can now check into this event over Bluetooth.',
      );
    }
  };

  const handleSelfCheckIn = async () => {
    if (!event || !ownProfile) return;
    setActionLoading(true);

    try {
      const res = await CheckInService.processCheckIn(
        event.id,
        ownProfile.deviceId,
        event.organizerId,
        'BLUETOOTH',
      );

      if (res.success) {
        Alert.alert('Checked In!', 'You have successfully checked into this event via Bluetooth.');
        loadData();
      } else {
        Alert.alert('Check-In Failed', res.error || 'Unable to complete check-in.');
      }
    } catch (_) {
      Alert.alert('Error', 'Check-in processing error.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const regStatus: RegistrationStatus = registration ? registration.status : 'Not Registered';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.black }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {event.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        {!!event.bannerUrl && (
          <Image
            source={{ uri: event.bannerUrl }}
            style={[styles.banner, { borderColor: colors.black }]}
          />
        )}

        {/* Content Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.black,
              shadowColor: colors.black,
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.themeBadge,
                { backgroundColor: colors.yellow, borderColor: colors.black },
              ]}
            >
              <Text style={styles.badgeText}>{event.theme}</Text>
            </View>

            <View
              style={[
                styles.capacityBadge,
                { backgroundColor: colors.blue, borderColor: colors.black },
              ]}
            >
              <Text style={styles.badgeText}>
                👥 {attendeeCount} / {event.capacity} Capacity
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{event.title}</Text>
          <Text style={[styles.organizer, { color: colors.textSecondary }]}>
            Hosted by {event.organizerName}
          </Text>

          {/* Key Info Box */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.background, borderColor: colors.black },
            ]}
          >
            <Text style={[styles.infoItem, { color: colors.textPrimary }]}>
              📅 Date: <Text style={styles.bold}>{event.date}</Text>
            </Text>
            <Text style={[styles.infoItem, { color: colors.textPrimary }]}>
              ⏰ Time:{' '}
              <Text style={styles.bold}>
                {event.startTime} - {event.endTime}
              </Text>
            </Text>
            <Text style={[styles.infoItem, { color: colors.textPrimary }]}>
              📍 Venue: <Text style={styles.bold}>{event.venue}</Text>
            </Text>
            <Text style={[styles.infoItem, { color: colors.textPrimary }]}>
              🛡️ RSVP Approval:{' '}
              <Text style={styles.bold}>
                {event.rsvpMode === 'AUTO' ? 'Instant Approval' : 'Manual Organizer Review'}
              </Text>
            </Text>

            {!!event.website && (
              <TouchableOpacity onPress={() => Linking.openURL(event.website!)}>
                <Text style={[styles.infoItem, { color: colors.purple }]}>
                  🌐 Website: <Text style={styles.bold}>{event.website}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {!!event.contact && (
              <Text style={[styles.infoItem, { color: colors.textPrimary }]}>
                ✉️ Contact: <Text style={styles.bold}>{event.contact}</Text>
              </Text>
            )}
          </View>

          {/* Tags */}
          {!!event.tags && event.tags.length > 0 && (
            <View style={styles.tagRow}>
              {event.tags.map((t, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.background, borderColor: colors.black },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.textPrimary }]}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About Event</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {event.description}
          </Text>

          {/* Member Registration Action Section */}
          <View style={styles.actionSection}>
            {regStatus === 'Not Registered' && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.purple, borderColor: colors.black },
                ]}
                onPress={handleRegister}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.black} size="small" />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.black }]}>
                    🎟️ 1-Tap Register with TechPass
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {regStatus === 'Approved' && (
              <View style={styles.statusBox}>
                <View
                  style={[
                    styles.statusBanner,
                    { backgroundColor: colors.green, borderColor: colors.black },
                  ]}
                >
                  <Text style={[styles.statusBannerText, { color: colors.black }]}>
                    ✅ Registration Approved!
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.yellow,
                      borderColor: colors.black,
                      marginTop: spacing.md,
                    },
                  ]}
                  onPress={handleSelfCheckIn}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.black }]}>
                    📡 Check-In via Bluetooth
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCancelRegistration} style={styles.cancelBtn}>
                  <Text style={[styles.cancelText, { color: colors.error }]}>
                    Cancel Registration
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {regStatus === 'Pending' && (
              <View style={styles.statusBox}>
                <View
                  style={[
                    styles.statusBanner,
                    { backgroundColor: colors.yellow, borderColor: colors.black },
                  ]}
                >
                  <Text style={[styles.statusBannerText, { color: colors.black }]}>
                    ⏳ Registration Pending Approval
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCancelRegistration} style={styles.cancelBtn}>
                  <Text style={[styles.cancelText, { color: colors.error }]}>Cancel RSVP</Text>
                </TouchableOpacity>
              </View>
            )}

            {regStatus === 'Checked In' && (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: colors.purple, borderColor: colors.black },
                ]}
              >
                <Text style={[styles.statusBannerText, { color: colors.black }]}>
                  🎟️ Checked In to Event!
                </Text>
              </View>
            )}
          </View>

          {/* Organizer Controls */}
          {isOrganizer && (
            <View
              style={[
                styles.organizerBox,
                { backgroundColor: colors.background, borderColor: colors.black },
              ]}
            >
              <Text style={[styles.organizerTitle, { color: colors.textPrimary }]}>
                🎪 ORGANIZER DASHBOARD & CONTROLS
              </Text>

              <View style={styles.orgBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.orgBtn,
                    { backgroundColor: colors.yellow, borderColor: colors.black },
                  ]}
                  onPress={openEditModal}
                >
                  <Text style={[styles.orgBtnText, { color: colors.black }]}>✏️ Edit Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.orgBtn,
                    { backgroundColor: colors.blue, borderColor: colors.black },
                  ]}
                  onPress={() => setShowRegistrationsModal(true)}
                >
                  <Text style={[styles.orgBtnText, { color: colors.black }]}>
                    📋 Registrations ({registrationsList.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.checkInModeBtn,
                  {
                    backgroundColor: isCheckInActive ? colors.error : colors.purple,
                    borderColor: colors.black,
                    marginTop: spacing.sm,
                  },
                ]}
                onPress={handleToggleCheckInMode}
                activeOpacity={0.8}
              >
                <Text style={[styles.checkInModeText, { color: colors.black }]}>
                  {isCheckInActive ? '🛑 Close BLE Check-In Mode' : '📡 Open BLE Check-In Mode'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.error, marginTop: spacing.md }]}
                onPress={handleDeleteEvent}
              >
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>🗑️ Delete Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* REGISTRATIONS MANAGEMENT MODAL (FOR ORGANIZERS) */}
      <Modal
        visible={showRegistrationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegistrationsModal(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.black },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Attendee Registrations ({registrationsList.length})
              </Text>
              <TouchableOpacity onPress={() => setShowRegistrationsModal(false)}>
                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {registrationsList.length === 0 ? (
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No user registrations for this event yet.
              </Text>
            ) : (
              <FlatList
                data={registrationsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.regItem,
                      { backgroundColor: colors.background, borderColor: colors.black },
                    ]}
                  >
                    <Text style={[styles.regName, { color: colors.textPrimary }]}>
                      {item.techPassSnapshot.displayName}
                    </Text>
                    <Text style={[styles.regSub, { color: colors.textSecondary }]}>
                      {item.techPassSnapshot.headline || item.techPassSnapshot.company || 'Techie'}
                    </Text>
                    <Text style={[styles.regStatus, { color: colors.purple }]}>
                      Status: {item.status}
                    </Text>

                    {item.status === 'Pending' && (
                      <View style={styles.regActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.smallApproveBtn,
                            { backgroundColor: colors.green, borderColor: colors.black },
                          ]}
                          onPress={() => handleUpdateRegStatus(item.id, 'Approved')}
                        >
                          <Text style={[styles.smallBtnText, { color: colors.black }]}>
                            Approve
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.smallRejectBtn,
                            { backgroundColor: colors.error, borderColor: colors.black },
                          ]}
                          onPress={() => handleUpdateRegStatus(item.id, 'Rejected')}
                        >
                          <Text style={[styles.smallBtnText, { color: colors.white }]}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* EDIT EVENT MODAL (FOR ORGANIZERS) */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.black },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Event</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Title</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.black,
                    color: colors.textPrimary,
                  },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.black,
                    color: colors.textPrimary,
                  },
                ]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Venue</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.black,
                    color: colors.textPrimary,
                  },
                ]}
                value={editVenue}
                onChangeText={setEditVenue}
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Date</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.black,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={editDate}
                    onChangeText={setEditDate}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Start Time</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.black,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={editStartTime}
                    onChangeText={setEditStartTime}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Capacity</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.black,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={editCapacityText}
                    onChangeText={setEditCapacityText}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      { backgroundColor: colors.yellow, borderColor: colors.black },
                    ]}
                    onPress={() =>
                      setEditStatus(editStatus === 'PUBLISHED' ? 'CANCELLED' : 'PUBLISHED')
                    }
                  >
                    <Text style={[styles.statusToggleText, { color: colors.black }]}>
                      {editStatus}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.purple, borderColor: colors.black },
                ]}
                onPress={handleSaveEdit}
                disabled={actionLoading}
              >
                <Text style={[styles.submitBtnText, { color: colors.black }]}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 2.5,
  },
  backBtn: { marginRight: spacing.md },
  backText: { fontSize: typography.sm, fontWeight: typography.extrabold },
  headerTitle: {
    fontSize: typography.base + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    flex: 1,
  },
  scrollContent: { padding: spacing.base },
  banner: {
    width: '100%',
    height: 180,
    borderRadius: spacing.radiusXl,
    borderWidth: 2.5,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: spacing.radiusXl,
    borderWidth: 3,
    padding: spacing.lg,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  themeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  capacityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  badgeText: { fontSize: typography.xs - 1, fontWeight: typography.extrabold },
  title: {
    fontSize: typography.xl,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    marginBottom: 2,
  },
  organizer: { fontSize: typography.xs + 1, fontWeight: typography.bold, marginBottom: spacing.md },
  infoBox: {
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoItem: { fontSize: typography.xs + 1 },
  bold: { fontWeight: typography.extrabold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusSm,
    borderWidth: 1.5,
  },
  tagText: { fontSize: typography.xs - 1, fontWeight: typography.bold },
  sectionTitle: {
    fontSize: typography.base,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  description: { fontSize: typography.sm, lineHeight: 22, marginBottom: spacing.xl },
  actionSection: { marginBottom: spacing.lg },
  primaryBtn: {
    paddingVertical: spacing.md + 2,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: typography.base, fontWeight: typography.extrabold },
  statusBox: { alignItems: 'center' },
  statusBanner: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
  },
  statusBannerText: { fontSize: typography.sm + 1, fontWeight: typography.extrabold },
  cancelBtn: { marginTop: spacing.md, padding: spacing.xs },
  cancelText: { fontSize: typography.xs + 1, fontWeight: typography.bold },
  organizerBox: {
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
  },
  organizerTitle: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  orgBtnRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginBottom: spacing.xs },
  orgBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radiusMd,
    borderWidth: 2,
    alignItems: 'center',
  },
  orgBtnText: { fontSize: typography.xs, fontWeight: typography.extrabold },
  checkInModeBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    alignItems: 'center',
  },
  checkInModeText: { fontSize: typography.sm, fontWeight: typography.extrabold },
  deleteBtn: {
    width: '100%',
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radiusMd,
    borderWidth: 2,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: typography.xs + 1, fontWeight: typography.extrabold },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: spacing.radiusXl,
    borderWidth: 3,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.base + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
  },
  closeIcon: { fontSize: 20, fontWeight: typography.bold },
  emptySub: { fontSize: typography.sm, textAlign: 'center', marginVertical: spacing.lg },
  regItem: {
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  regName: { fontSize: typography.sm + 1, fontWeight: typography.extrabold },
  regSub: { fontSize: typography.xs },
  regStatus: { fontSize: typography.xs, fontWeight: typography.bold, marginVertical: 4 },
  regActionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  smallApproveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
    borderWidth: 1.5,
  },
  smallRejectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
    borderWidth: 1.5,
  },
  smallBtnText: { fontSize: typography.xs, fontWeight: typography.extrabold },
  modalScroll: { width: '100%' },
  label: { fontSize: typography.xs, fontWeight: typography.extrabold, marginBottom: spacing.xs },
  input: {
    borderWidth: 2,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    marginBottom: spacing.md,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  statusToggleBtn: {
    borderWidth: 2,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statusToggleText: { fontSize: typography.xs, fontWeight: typography.extrabold },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnText: { fontSize: typography.sm, fontWeight: typography.extrabold },
});
