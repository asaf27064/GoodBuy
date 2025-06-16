import React, { useState, useRef, useLayoutEffect, useEffect } from 'react'
import axios from 'axios'
import { SafeAreaView, FlatList, View, Text, TouchableHighlight, Alert } from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import ProductListItem from '../components/EditListScreenItem'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { listObj: initialList } = route.params
  const [listObj, setListObj] = useState(initialList)
  const [products, setProducts] = useState(initialList.products || [])
  const initialRef = useRef([...initialList.products || []])
  const { user } = useAuth()

  // Reset state when screen comes into focus (handles navigation back/forward properly)
  useFocusEffect(
    React.useCallback(() => {
      // Check if we have a fresh addedItem that needs to be processed
      const addedItem = route.params?.addedItem
      if (addedItem) {
        // Add the new item
        const newEntry = { product: addedItem, numUnits: 1 }
        setProducts(prevProducts => {
          // Avoid duplicates
          const exists = prevProducts.some(p => p.product.itemCode === addedItem.itemCode)
          if (exists) return prevProducts
          return [...prevProducts, newEntry]
        })
        
        // Clear the addedItem param immediately to prevent re-processing
        navigation.setParams({ addedItem: undefined })
      }
    }, [route.params?.addedItem, navigation])
  )

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="plus"
          color={theme.colors.onPrimary}
          onPress={() =>
            navigation.navigate('AddItem', {
              // Pass current state, not params
              listObj: { ...listObj, products }
            })
          }
        />
      )
    })
  }, [navigation, theme.colors.onPrimary, listObj, products])

  const diffLog = (oldList, newList) => {
    const CurrentUser = user?.username
    const edits = []
    oldList.forEach(o => {
      const m = newList.find(n => n.product.itemCode === o.product.itemCode)
      if (!m) edits.push({ product: o.product, action: 'removed', changedBy: CurrentUser, timeStamp: new Date() })
      else if (m.numUnits !== o.numUnits)
        edits.push({ product: o.product, action: 'updated', changedBy: CurrentUser, difference: m.numUnits - o.numUnits, timeStamp: new Date() })
    })
    newList.forEach(n => {
      if (!oldList.find(o => o.product.itemCode === n.product.itemCode))
        edits.push({ product: n.product, action: 'added', changedBy: CurrentUser, timeStamp: new Date() })
    })
    return edits
  }

  const saveChanges = async () => {
    const changes = diffLog(initialRef.current, products)
    const updatedListObj = { ...listObj, products }
    const payload = {
      list: { ...updatedListObj, editLog: [ ...(listObj.editLog || []), ...changes ] },
      changes
    }

    try {
      const { data } = await axios.put(`/api/ShoppingLists/${listObj._id}`, payload)
      const updated = data.list || data
      
      // Update local state with server response
      setListObj(updated)
      setProducts(updated.products || [])
      initialRef.current = [ ...(updated.products || []) ]
      
      Alert.alert('Success', 'List saved successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back and refresh parent screen
            navigation.navigate('My Shopping Lists', { 
              refreshList: updated._id,
              timestamp: Date.now() // Force refresh
            })
          }
        }
      ])
    } catch (e) {
      Alert.alert('Save Failed', JSON.stringify(e.response?.data || e.message, null, 2), [{ text: 'OK' }])
    }
  }

  const removeProduct = (productToRemove) => {
    setProducts(prevProducts => {
      const filtered = prevProducts.filter(x => x !== productToRemove)
      return filtered
    })
    // Update listObj to keep it in sync
    setListObj(prevList => ({
      ...prevList,
      products: products.filter(x => x !== productToRemove)
    }))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(item, index) => `${item.product.itemCode}_${index}`}
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            removeProduct={removeProduct}
          />
        )}
        contentContainerStyle={{ padding: 8 }}
      />
      <View
        style={{
          padding: 16,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderColor: theme.colors.outline,
          paddingBottom: insets.bottom + 80,
          zIndex: 1000,
          elevation: 10
        }}
      >
        <TouchableHighlight
          onPress={saveChanges}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.roundness,
            padding: 12,
            alignItems: 'center'
          }}
          underlayColor={theme.colors.primary}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Save Changes</Text>
        </TouchableHighlight>
      </View>
    </SafeAreaView>
  )
}