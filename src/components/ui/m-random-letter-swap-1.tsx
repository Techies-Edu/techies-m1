import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RandomLetterSwap } from './RandomLetterSwap';

const links = ['Nearby', 'Network', 'Events', 'Alerts', 'Settings'];

export default function RandomLetterSwapNav({ activeTab }: { activeTab?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        {links.map((link) => (
          <RandomLetterSwap
            key={link}
            label={link}
            isActive={activeTab === link}
            staggerDuration={0.025}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
