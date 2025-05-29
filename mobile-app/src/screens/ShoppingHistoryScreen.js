import React, { useEffect, useState } from 'react'
import { SafeAreaView, FlatList, Text } from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import axios from 'axios'

export default function ShoppingHistoryScreen() {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const [history, setHistory] = useState([])

  useEffect(() => {
    axios.get('/api/ShoppingHistory').then(r => setHistory(r.data))
  }, [])

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={history}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <Text style={styles.text}>{item.date}: {item.summary}</Text>
        )}
      />
    </SafeAreaView>
  )
}
