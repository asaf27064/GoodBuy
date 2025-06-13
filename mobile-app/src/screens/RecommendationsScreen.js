import React, { useState, useEffect } from 'react';
import { SafeAreaView, FlatList, View, StyleSheet } from 'react-native';
import {
  useTheme,
  Card,
  Button,
  Text,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function RecommendationsScreen({ route, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { listObj } = route.params;

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `/api/Recommendations?listId=${listObj._id}`
        );
        setRecs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [listObj._id]);

  const handleAdd = (item) =>
    navigation.navigate('EditItems', { addedItem: item, listObj });
  const handleDismiss = (code) =>
    setRecs((prev) => prev.filter((r) => r.itemCode !== code));

  const renderItem = ({ item }) => {
    const lastDate = item.lastPurchased
      ? new Date(item.lastPurchased)
      : null;
    const dateText = lastDate
      ? lastDate.toLocaleDateString()
      : null;
    const lastLabel = lastDate
      ? `Last purchased on ${dateText}`
      : 'Never purchased before';

    let methodLabel = '';
    switch (item.method) {
      case 'habit':
        methodLabel = lastDate
          ? `You typically buy this on ${lastDate.toLocaleDateString(undefined, { weekday: 'long' })}`
          : 'Habit-based recommendation';
        break;
      case 'co-occurrence':
        methodLabel = 'Often bought together with items in your list';
        break;
      case 'personal':
        methodLabel = 'Recommended from your past purchases';
        break;
      case 'cf':
        methodLabel = 'Popular with shoppers like you';
        break;
      default:
        methodLabel = '';
    }

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {item.image && <Card.Cover source={{ uri: item.image }} style={styles.cover} />}
        <Card.Title
          title={item.name}
          subtitle={methodLabel}
          titleNumberOfLines={1}
          subtitleNumberOfLines={2}
          titleStyle={{ color: theme.colors.onSurface }}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          right={(props) => (
            <IconButton
              {...props}
              icon="close"
              onPress={() => handleDismiss(item.itemCode)}
              color={theme.colors.disabled}
            />
          )}
        />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>              
              {lastLabel}
            </Text>
            <Button
              mode="contained"
              compact
              onPress={() => handleAdd(item)}
              contentStyle={styles.addButtonContent}
              style={{ backgroundColor: theme.colors.primary }}
              labelStyle={{ color: theme.colors.onPrimary }}
            >
              Add to list
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={recs}
        keyExtractor={(item) => item.itemCode}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 60 }]}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
              No recommendations right now. Try adding items to your list first!
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 8 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  cover: { height: 120 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: { fontSize: 12 },
  addButtonContent: { paddingVertical: 4, paddingHorizontal: 12 },
  emptyContainer: { marginTop: 40, alignItems: 'center' },
});
