import React, { useEffect, useState } from 'react'
import { SafeAreaView, FlatList } from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import axios from 'axios'

export default function PriceComparisonScreen() {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const [data, setData] = useState([])

  useEffect(() => {
    axios.get('/api/PriceComparison').then(r => setData(r.data))
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <PriceComparisonItem item={item} />}
      />
    </SafeAreaView>
  )
}
