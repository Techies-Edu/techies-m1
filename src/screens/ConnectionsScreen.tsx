/**
 * ConnectionsScreen — Persistent Saved Connections Feed with Real-time Search & Link Launchers.
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ConnectionService from '../services/connection/ConnectionService';
import { Connection } from '../types/ConnectionTypes';
import { ConnectionCard } from '../components/ConnectionCard';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Connections'>;

export const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const isFocused = useIsFocused();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ConnectionService.searchConnections(searchQuery);
      setConnections(list);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isFocused) {
      loadConnections();
    }
  }, [isFocused, loadConnections]);

  const handleConnectionPress = (deviceId: string) => {
    navigation.navigate('Profile', { deviceId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <Text style={styles.headerTitle}>My Connections</Text>
          {connections.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{connections.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search Input Hero Section */}
      <View style={styles.searchHeroContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search connections by name, company, skill..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Connections List */}
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#4F46E5" size="large" />
          </View>
        ) : connections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconEmoji}>🤝</Text>
            </View>
            <Text style={styles.emptyTitle}>No Connections Yet</Text>
            <Text style={styles.emptySub}>
              Use Nearby BLE, scan a TechPass QR Code, or tap an NFC tag to connect with
              professionals.
            </Text>
          </View>
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConnectionCard
                connection={item}
                onPress={() => handleConnectionPress(item.peerUserId)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 10,
  },
  countBadge: {
    backgroundColor: '#FEE57E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchHeroContainer: {
    backgroundColor: '#FDECDA',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 24,
    padding: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1F2937',
  },
  container: {
    flex: 1,
    paddingTop: 12,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
