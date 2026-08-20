/**
 * EventsScreen — Techies Event Ecosystem Feed (Member & Organizer Roles).
 * Real Persistent Events Hub with search, category filtering, real-time updates,
 * organizer creation tools, capacity tracking, and offline status indicator.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import EventService from '../services/event/EventService';
import EventSyncService from '../services/event/EventSyncService';
import BackendEventStore from '../services/event/BackendEventStore';
import AuthService from '../services/auth/AuthService';
import * as ProfileStore from '../services/profile/ProfileStore';
import { TechiesEvent, EventRegistration, EventRsvpMode } from '../types/EventTypes';
import { EventCard } from '../components/EventCard';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Events'>;

const CATEGORIES = [
  'All',
  'Conference',
  'Hackathon',
  'Meetup',
  'P2P',
  'AI',
  'Mobile',
  'My Registered',
];

export const EventsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const isFocused = useIsFocused();

  const [events, setEvents] = useState<TechiesEvent[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Map<string, EventRegistration>>(
    new Map(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  // Create Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [theme, setTheme] = useState('P2P & Tech');
  const [date, setDate] = useState('2026-09-20');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [capacityText, setCapacityText] = useState('100');
  const [categoriesText, setCategoriesText] = useState('Conference, P2P');
  const [tagsText, setTagsText] = useState('BLE, React Native');
  const [website, setWebsite] = useState('');
  const [contact, setContact] = useState('');
  const [rsvpMode, setRsvpMode] = useState<EventRsvpMode>('AUTO');
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  );
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession();
      if (session) {
        setIsOrganizer(session.role === 'ORGANIZER');
        setCurrentUserId(session.uid);

        const ownProf = await ProfileStore.getMyProfile();
        if (ownProf) {
          setCurrentUserName(ownProf.displayName || ownProf.username || 'Organizer');
        }

        const userRegs = await EventService.getUserRegistrations(ownProf?.deviceId || session.uid);
        const map = new Map<string, EventRegistration>();
        userRegs.forEach((r) => map.set(r.eventId, r));
        setUserRegistrations(map);
      }

      const allEvents = await EventService.getEvents();
      setEvents(allEvents);
      setIsOffline(EventSyncService.isOffline());
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  // Real-time backend subscription listener
  useEffect(() => {
    const unsubEvents = BackendEventStore.subscribeEvents((updatedEvents) => {
      setEvents(updatedEvents);
    });
    const unsubSync = EventSyncService.subscribeSyncStatus((offline) => {
      setIsOffline(offline);
    });

    return () => {
      unsubEvents();
      unsubSync();
    };
  }, []);

  const handleCreateEvent = async () => {
    if (!title.trim() || !description.trim() || !venue.trim()) {
      setErrorMsg('Please fill in title, description, and venue.');
      return;
    }

    setCreateLoading(true);
    setErrorMsg('');

    try {
      const cap = parseInt(capacityText, 10) || 50;
      const parsedCategories = categoriesText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const parsedTags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await EventService.createEvent(currentUserId || 'org_user', currentUserName || 'Organizer', {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        theme: theme.trim(),
        date: date.trim(),
        startTime: startTime.trim() || '10:00 AM',
        endTime: endTime.trim() || '05:00 PM',
        capacity: cap,
        rsvpMode,
        eventStatus: 'PUBLISHED',
        bannerUrl:
          bannerUrl.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        website: website.trim(),
        contact: contact.trim(),
        categories: parsedCategories.length ? parsedCategories : ['General'],
        tags: parsedTags,
      });

      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Failed to create event.');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setVenue('');
    setTheme('P2P & Tech');
    setDate('2026-09-20');
    setStartTime('10:00 AM');
    setEndTime('05:00 PM');
    setCapacityText('100');
    setWebsite('');
    setContact('');
    setErrorMsg('');
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'My Registered') {
      const reg = userRegistrations.get(e.id);
      return reg && reg.status !== 'Cancelled';
    }

    return (
      (e.categories || []).some((c) => c.toLowerCase() === selectedCategory.toLowerCase()) ||
      e.theme.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });

  const [activeTab, setActiveTab] = useState<'ATTENDEE' | 'ORGANIZER'>('ATTENDEE');

  // Organizer Dashboard stats computation
  const totalEvents = events.length;
  const totalRegistrations = Array.from(userRegistrations.values()).length;
  const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 50), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Events Hub</Text>
          {isOrganizer && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>🎪 ORGANIZER</Text>
            </View>
          )}
        </View>

        {/* Mode Switcher Tabs for Organizers */}
        {isOrganizer && (
          <View style={styles.tabBarRow}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'ATTENDEE' && styles.activeTabItem]}
              onPress={() => setActiveTab('ATTENDEE')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'ATTENDEE' && styles.activeTabText]}>
                👥 Attendee View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'ORGANIZER' && styles.activeTabItem]}
              onPress={() => setActiveTab('ORGANIZER')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'ORGANIZER' && styles.activeTabText]}>
                🎪 Organizer Mode
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Offline Status Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚡ Offline Mode — Showing cached events. Synchronization will resume when connected.
          </Text>
        </View>
      )}

      {/* ORGANIZER DASHBOARD VIEW */}
      {isOrganizer && activeTab === 'ORGANIZER' ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.organizerScrollContent}>
          {/* Organizer Metrics Hero Card */}
          <View style={styles.organizerMetricsCard}>
            <Text style={styles.metricsTitle}>📊 Organizer Dashboard</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalEvents}</Text>
                <Text style={styles.statLabel}>Managed Events</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalRegistrations}</Text>
                <Text style={styles.statLabel}>Total RSVPs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalCapacity}</Text>
                <Text style={styles.statLabel}>Total Capacity</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.createEventHeaderBtn}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.createEventHeaderBtnText}>➕ Create & Publish New Event</Text>
            </TouchableOpacity>
          </View>

          {/* Organizer Event Management List */}
          <Text style={styles.sectionHeaderTitle}>Manage Community Events</Text>
          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Events Created Yet</Text>
              <Text style={styles.emptySub}>
                Tap the Create Event button above to publish your first community meetup or
                hackathon.
              </Text>
            </View>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.organizerEventCard}>
                <View style={styles.orgCardHeader}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{e.theme || 'Tech'}</Text>
                  </View>
                  <Text style={styles.statusPill}>Published</Text>
                </View>
                <Text style={styles.orgEventTitle}>{e.title}</Text>
                <Text style={styles.orgEventSub}>
                  📅 {e.date} • 🕒 {e.startTime || '10:00 AM'}
                </Text>
                <Text style={styles.orgEventSub}>📍 {e.venue}</Text>
                <View style={styles.orgCardActions}>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                  >
                    <Text style={styles.manageBtnText}>📋 Attendees & Check-in</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* ATTENDEE DISCOVERY VIEW */
        <>
          {/* Search Bar */}
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search tech events, hackathons, tags, venues..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Chips Bar */}
          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => {
                const isSel = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSel && styles.activeCategoryChip]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryChipText, isSel && styles.activeCategoryChipText]}>
                      {cat === 'My Registered' ? '🎟️ My Events' : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Event List */}
          <View style={styles.container}>
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator color="#4F46E5" size="large" />
              </View>
            ) : filteredEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyIconEmoji}>📅</Text>
                </View>
                <Text style={styles.emptyTitle}>No Events Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your search query or category filters.'
                    : 'Check back soon or create a new community event.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const reg = userRegistrations.get(item.id);
                  return (
                    <EventCard
                      event={item}
                      registrationStatus={reg ? reg.status : 'Not Registered'}
                      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                    />
                  );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#4F46E5']}
                    tintColor="#4F46E5"
                  />
                }
              />
            )}
          </View>
        </>
      )}

      {/* Organizer Create Event Floating Action Button */}
      {isOrganizer && activeTab === 'ATTENDEE' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>➕ Create Event</Text>
        </TouchableOpacity>
      )}

      {/* STRUCTURED CREATE EVENT MODAL */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Community Event</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* SECTION 1: EVENT DETAILS */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionTitle}>📌 Event Details</Text>
                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. AI & Mobile Dev Summit"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Detailed event overview..."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Venue & Location *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Innovation Hub Hall B & Online"
                  placeholderTextColor="#9CA3AF"
                  value={venue}
                  onChangeText={setVenue}
                />

                <Text style={styles.label}>Theme / Topic</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. P2P Protocols & Mobile AI"
                  placeholderTextColor="#9CA3AF"
                  value={theme}
                  onChangeText={setTheme}
                />

                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2026-09-20"
                      placeholderTextColor="#9CA3AF"
                      value={date}
                      onChangeText={setDate}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10:00 AM"
                      placeholderTextColor="#9CA3AF"
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION 2: EVENT SETTINGS & CAPACITY */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionTitle}>⚙️ Event Settings & Capacity</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>Max Capacity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100"
                      placeholderTextColor="#9CA3AF"
                      value={capacityText}
                      onChangeText={setCapacityText}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.flex1}>
                    <Text style={styles.label}>RSVP Mode</Text>
                    <TouchableOpacity
                      style={styles.rsvpBtn}
                      onPress={() => setRsvpMode(rsvpMode === 'AUTO' ? 'MANUAL_APPROVAL' : 'AUTO')}
                    >
                      <Text style={styles.rsvpBtnText}>
                        {rsvpMode === 'AUTO' ? '⚡ Auto Approve' : '🛡️ Manual Review'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>Categories (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Conference, Hackathon, P2P"
                  placeholderTextColor="#9CA3AF"
                  value={categoriesText}
                  onChangeText={setCategoriesText}
                />

                <Text style={styles.label}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="BLE, React Native, TypeScript"
                  placeholderTextColor="#9CA3AF"
                  value={tagsText}
                  onChangeText={setTagsText}
                />
              </View>

              {/* SECTION 3: MEDIA & CONTACT */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionTitle}>🖼️ Media & Contact</Text>
                <Text style={styles.label}>Website Link (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://techies.app/event-info"
                  placeholderTextColor="#9CA3AF"
                  value={website}
                  onChangeText={setWebsite}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Contact Email (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="organizer@techies.app"
                  placeholderTextColor="#9CA3AF"
                  value={contact}
                  onChangeText={setContact}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Banner Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#9CA3AF"
                  value={bannerUrl}
                  onChangeText={setBannerUrl}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateEvent}
                disabled={createLoading}
                activeOpacity={0.85}
              >
                {createLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Publish Community Event →</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleBadge: {
    backgroundColor: '#FEE57E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  tabBarRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTabItem: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  organizerMetricsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FE',
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  createEventHeaderBtn: {
    backgroundColor: '#FEE57E',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  createEventHeaderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  organizerEventCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#FDECDA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  orgEventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  orgEventSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  orgCardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  manageBtn: {
    backgroundColor: '#F4F3FA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeCategoryChip: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeCategoryChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  organizerScrollContent: {
    paddingBottom: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4F3FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalScroll: {
    width: '100%',
  },
  formSectionBox: {
    marginBottom: 16,
    backgroundColor: '#F8F9FE',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  rsvpBtn: {
    backgroundColor: '#FDECDA',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rsvpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
