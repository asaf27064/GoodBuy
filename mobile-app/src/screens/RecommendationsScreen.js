import React, { useState, useEffect } from 'react'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme, Card, Title, Paragraph, Caption, Button } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function RecommendationsScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { listObj } = route.params

  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await axios.get(
          `/api/Recommendations?listId=${listObj._id}`
        )
        setRecs(data)
      } catch (err) {
        console.error('Error fetching recommendations:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [listObj._id])

  const handleAdd = item => {
    navigation.navigate('EditItems', { addedItem: item, listObj })
  }

  const handleDismiss = itemCode => {
    setRecs(r => r.filter(r => r.itemCode !== itemCode))
  }

  const renderRec = ({ item }) => {
    const lastDate = item.lastPurchased ? new Date(item.lastPurchased) : null
    const weekdayName = lastDate
      ? lastDate.toLocaleDateString(undefined, { weekday: 'long' })
      : ''

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>  
        {item.image && (
          <Card.Cover
            source={{ uri: item.image }}
            style={styles.cardCover}
          />
        )}
        <Card.Content>
          <Title style={styles.title}>{item.name}</Title>
          <Paragraph style={styles.paragraph}>
            Last bought: {lastDate ? lastDate.toLocaleDateString() : 'Never'}
          </Paragraph>
          <Caption style={{ color: theme.colors.placeholder }}>
            {item.method === 'habit'
              ? `Weekly habit: typically on ${weekdayName}`
              : item.method === 'co-occurrence'
              ? 'Often bought with items in your list'
              : 'Based on your purchase history'}
          </Caption>
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button mode="text" onPress={() => handleDismiss(item.itemCode)}>
            Dismiss
          </Button>
          <Button mode="contained" onPress={() => handleAdd(item)}>
            Add
          </Button>
        </Card.Actions>
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recs}
        keyExtractor={r => r.itemCode}
        renderItem={renderRec}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 100
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>No recommendations right now.</Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    overflow: 'hidden'
  },
  cardCover: {
    height: 150,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  title: {
    fontSize: 18,
    marginBottom: 4
  },
  paragraph: {
    marginBottom: 4
  },
  actions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  emptyText: { textAlign: 'center', marginTop: 32 }
})
