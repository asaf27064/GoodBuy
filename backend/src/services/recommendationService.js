// mobile-app/src/screens/RecommendationsScreen.js

import React, { useState, useEffect } from 'react'
import { SafeAreaView, FlatList, Text, View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme, Card, Title, Paragraph, Button, Caption } from 'react-native-paper'
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
    navigation.navigate('EditItems', {
      addedItem: item,
      listObj
    })
  }

  const handleDismiss = itemCode => {
    setRecs(r => r.filter(r => r.itemCode !== itemCode))
  }

  const renderRec = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>  
      {item.image && <Card.Cover source={{ uri: item.image }} />}
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>Last bought: {item.lastPurchased ? new Date(item.lastPurchased).toLocaleDateString() : 'Never'}</Paragraph>
        <Caption style={{ color: theme.colors.placeholder }}>
          {item.method === 'co-occurrence'
            ? 'Frequently bought with items in your list'
            : 'Based on your past purchases'}
        </Caption>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => handleDismiss(item.itemCode)}>Dismiss</Button>
        <Button onPress={() => handleAdd(item)}>Add</Button>
      </Card.Actions>
    </Card>
  )

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
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
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
  card: { marginBottom: 12 },
  emptyText: { textAlign: 'center', marginTop: 32 }
})
