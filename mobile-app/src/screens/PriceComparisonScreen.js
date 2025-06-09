import React, { useState, useEffect } from 'react'
import axios from 'axios'
import * as Location from 'expo-location'
import {
  View,
  Text,
  Button,
  SafeAreaView,
  FlatList,
  StyleSheet
} from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

export default function PriceComparisonScreen({ route }) {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)

  const [userLocation, setUserLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [nearestStores, setNearestStores] = useState([])

  const listProducts =
    route.params?.list?.listObj?.products ?? []

  useEffect(() => {
    ;(async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setErrorMsg('Location permission denied')
        return
      }
      let loc = await Location.getCurrentPositionAsync({})
      setUserLocation(loc)
    })()
  }, [])

  const searchNearestStores = async () => {
    if (!userLocation) return
    try {
      const { data } = await axios.get('/api/Stores/store_search', {
        params: {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude
        }
      })
      setNearestStores(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error locating stores:', err)
    }
  }

  const renderStore = ({ item }) => (
    <View style={localStyles.row}>
      <Text style={{ color: theme.colors.onSurface }}>
        {item.store.storeName}
      </Text>
    </View>
  )

  const priceComparator = async () => {
    const storeIds = nearestStores.map(i => i.store._id.$oid)
    const productParams = listProducts.map(i => ({
      productId: i.product._id,
      amount: i.numUnits
    }))

    try {
      const { data } = await axios.get('/api/Products/list_price', {
        params: {
          stores: JSON.stringify(storeIds),
          products: JSON.stringify(productParams)
        }
      })
      console.log('Price response:', data)
    } catch (err) {
      console.error('Error fetching prices:', err)
    }
  }

  return (
    <SafeAreaView style={[styles.container, localStyles.container]}>
      <Button title="Find Nearest Stores" onPress={searchNearestStores} />
      <Text style={localStyles.label}>Location:</Text>
      <Text style={localStyles.locationText}>
        {userLocation
          ? `Lat: ${userLocation.coords.latitude.toFixed(4)}, Lng: ${userLocation.coords.longitude.toFixed(4)}`
          : errorMsg || 'Fetching location...'}
      </Text>
      <FlatList
        data={nearestStores}
        keyExtractor={i => i.store._id.$oid}
        renderItem={renderStore}
        ListEmptyComponent={
          <Text style={localStyles.empty}>No stores yet.</Text>
        }
      />
      <Button title="Compare Prices" onPress={priceComparator} />
    </SafeAreaView>
  )
}

const localStyles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  label: { marginTop: 12, fontWeight: 'bold' },
  locationText: { marginBottom: 12 },
  empty: { textAlign: 'center', marginVertical: 20, color: '#666' }
})
