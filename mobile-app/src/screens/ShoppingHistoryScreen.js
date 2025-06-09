import React, { useEffect, useState } from 'react'
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  StyleSheet
} from 'react-native'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'

export default function ShoppingHistoryScreen() {
  const { user } = useAuth()
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)

  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!user?.id) return

    axios
      .get(`/api/Purchases/${user.id}`)
      .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching purchase history:', err)
        setHistory([])
      })
  }, [user])

  const renderItem = ({ item }) => (
    <View style={localStyles.row}>
      <Text style={{ color: theme.colors.onSurface }}>
        {new Date(item.timeStamp).toLocaleString()}
      </Text>
      <Text style={{ color: theme.colors.onSurface }}>
        {item.products?.length ?? 0} items
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={r => r._id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={localStyles.emptyText}>
            No purchase history yet.
          </Text>
        }
      />
    </SafeAreaView>
  )
}

const localStyles = StyleSheet.create({
  row: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  }
})
