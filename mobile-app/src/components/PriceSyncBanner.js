import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { useTheme, Button, ActivityIndicator } from 'react-native-paper';
import { PriceSyncContext } from '../contexts/PriceSyncContext';
import { MotiView } from 'moti';

export default function PriceSyncBanner() {
  const { lastSuccess, syncing, triggerSync } = useContext(PriceSyncContext);
  const theme = useTheme();

  const last = lastSuccess ? new Date(lastSuccess) : null;
  const stale = !last || (Date.now() - last.getTime() > 24*60*60*1e3);

  return (
    <View
      style={{
        backgroundColor: stale
          ? theme.colors.errorContainer
          : theme.colors.surfaceVariant,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        zIndex: 1,
        elevation: 1,
      }}
      pointerEvents="box-none"
    >
      <View style={{ width: 24, height: 24, marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
        {syncing ? (
          <MotiView
            animate={{ rotateZ: syncing ? '360deg' : '0deg' }}
            transition={{ loop: true, type: 'timing', duration: 1000 }}
          >
            <ActivityIndicator size={18} color={theme.colors.primary} />
          </MotiView>
        ) : null}
      </View>

      <Text 
        style={{ 
          flex: 1, 
          fontSize: 13,
          color: theme.colors.onSurfaceVariant,
          lineHeight: 16
        }}
        numberOfLines={2}
      >
        {last
          ? `Prices last updated: ${last.toLocaleString()}`
          : 'Prices have never been refreshed'}
      </Text>

      <Button
        mode="outlined"
        loading={syncing}
        disabled={syncing}
        onPress={triggerSync}
        compact
        style={{
          marginLeft: 8,
        }}
        contentStyle={{
          paddingHorizontal: 8,
        }}
      >
        Refresh Now
      </Button>
    </View>
  );
}