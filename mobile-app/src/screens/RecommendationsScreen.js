import React, { useState, useEffect } from 'react'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme, Card, Title, Paragraph, Caption, IconButton } from 'react-native-paper'
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

  const handleAdd = item => navigation.navigate('EditItems', { addedItem: item, listObj })
  const handleDismiss = code => setRecs(prev => prev.filter(r => r.itemCode !== code))

  const renderRec = ({ item }) => {
    const lastDate = item.lastPurchased ? new Date(item.lastPurchased) : null
    const infoDate = lastDate
      ? lastDate.toLocaleDateString()
      : 'Never purchased'
    let infoLabel = ''
    switch (item.method) {
      case 'habit': {
        const weekday = lastDate.toLocaleDateString(undefined, { weekday: 'long' })
        infoLabel = `Habit: you buy this on ${weekday}`
        break
      }
      case 'co-occurrence':
        infoLabel = 'Often bought with items in your list'
        break
      case 'personal':
        infoLabel = 'Based on your purchase history'
        break
      case 'novelty':
        infoLabel = 'New item: give it a try!'
        break
    }

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>  
        {item.image && (
          <Card.Cover
            source={{ uri: item.image }}
            style={styles.cardCover}
            resizeMode="cover"
          />
        )}
        <Card.Content style={styles.content}>
          <View style={styles.headerRow}>
            <Title style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Title>
            <IconButton
              icon="close"
              size={20}
              onPress={() => handleDismiss(item.itemCode)}
              color={theme.colors.disabled}
            />
          </View>
          <Paragraph style={styles.paragraph} numberOfLines={1}>
            {infoDate}
          </Paragraph>
          <Caption style={[styles.caption, { color: theme.colors.placeholder }]} numberOfLines={2}>
            {infoLabel}
          </Caption>
          
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <IconButton
            icon="plus-circle-outline"
            size={30}
            onPress={() => handleAdd(item)}
            color={theme.colors.primary}
          />
        </Card.Actions>
      </Card>
    )
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recs}
        keyExtractor={(item, index) => `${item.itemCode}_${index}`}
        renderItem={renderRec}
        contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>No recommendations available.</Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginVertical: 6, marginHorizontal: 12, borderRadius: 10, elevation: 2, overflow: 'hidden' },
  cardCover: { height: 120, backgroundColor: '#e0e0e0' },
  content: { paddingVertical: 6, paddingHorizontal: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 4 },
  paragraph: { fontSize: 12, marginBottom: 4 },
  caption: { fontSize: 12, marginBottom: 2 },
    actions: { justifyContent: 'flex-end', paddingRight: 12, paddingBottom: 8 },
  emptyText: { textAlign: 'center', marginTop: 24, fontSize: 14 }
})
