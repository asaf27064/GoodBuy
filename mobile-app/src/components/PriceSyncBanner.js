import React, { useContext } from 'react';
import { View, Text }       from 'react-native';
import { useTheme, Button, ActivityIndicator } from 'react-native-paper';
import { PriceSyncContext } from '../contexts/PriceSyncContext';
import { MotiView }         from 'moti';

export default function PriceSyncBanner() {
  const { lastSuccess, syncing, triggerSync } = useContext(PriceSyncContext);
  const theme  = useTheme();

  const last   = lastSuccess ? new Date(lastSuccess) : null;
  const stale  = !last || (Date.now() - last.getTime() > 24*60*60*1e3);

  return (
    <View
      style={{
        backgroundColor: stale
          ? theme.colors.errorContainer
          : theme.colors.surfaceVariant,
        padding: 8, flexDirection:'row', alignItems:'center'
      }}
    >
      <MotiView
        animate={{ rotateZ: syncing ? '360deg' : '0deg' }}
        transition={{ loop: true, type:'timing', duration: 1000 }}
      >
        {syncing
          ? <ActivityIndicator size={18} color={theme.colors.primary}/>
          : null}
      </MotiView>

      <Text style={{ flex:1, marginLeft:8 }}>
        {last
          ? `Prices last updated: ${last.toLocaleString()}`
          : 'Prices have never been refreshed'}
      </Text>

      <Button
        mode="outlined"
        loading={syncing}
        disabled={syncing}
        onPress={triggerSync}
      >
        Refresh now
      </Button>
    </View>
  );
}
