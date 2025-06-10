// mobile-app/src/screens/EditListScreen.js

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react'
import axios from 'axios'
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  TouchableHighlight
} from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ProductListItem from '../components/EditListScreenItem'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  // Initialize from route.params.listObj
  const { listObj: initialList } = route.params
  const [listObj, setListObj] = useState(initialList)
  const [products, setProducts] = useState(initialList.products || [])

  // Keep original products for diff
  const initialRef = useRef([...initialList.products || []])

  // Update header button to pass the latest listObj+products
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="plus"
          color={theme.colors.onPrimary}
          onPress={() =>
            navigation.navigate('AddItem', {
              listObj: { ...listObj, products }
            })
          }
        />
      )
    })
  }, [navigation, theme.colors.onPrimary, listObj, products])

  // Handle addedItem from AddItemScreen
  useEffect(() => {
    const added = route.params?.addedItem
    if (added) {
      const newEntry = { product: added, numUnits: 1 }
      const newProducts = [...products, newEntry]
      setProducts(newProducts)

      const updatedList = { ...listObj, products: newProducts }
      setListObj(updatedList)

      // Reset route params so we don't re-add on every render
      navigation.setParams({ listObj: updatedList, addedItem: undefined })
    }
  }, [route.params?.addedItem])

  // Compute edit log
  const diffLog = (oldList, newList) => {
    const me = 'Me'
    const edits = []

    oldList.forEach(o => {
      const m = newList.find(n => n.product.itemName === o.product.itemName)
      if (!m) {
        edits.push({
          product: o.product,
          action: 'removed',
          changedBy: me,
          timeStamp: new Date()
        })
      } else if (m.numUnits !== o.numUnits) {
        edits.push({
          product: o.product,
          action: 'updated',
          changedBy: me,
          difference: m.numUnits - o.numUnits,
          timeStamp: new Date()
        })
      }
    })

    newList.forEach(n => {
      if (!oldList.find(o => o.product.itemName === n.product.itemName)) {
        edits.push({
          product: n.product,
          action: 'added',
          changedBy: me,
          timeStamp: new Date()
        })
      }
    })

    return edits
  }

  // Save changes to backend and update state/navigation
  const saveChanges = async () => {
    const edits = diffLog(initialRef.current, products)
    const payload = {
      list: { ...listObj, products, editLog: [...(listObj.editLog || []), ...edits] },
      changes: edits
    }
    try {
      const { data } = await axios.put(
        `/api/ShoppingLists/${listObj._id}`,
        payload
      )
      // data.list is the updated list from backend
      setListObj(data.list)
      setProducts(data.list.products)
      initialRef.current = [...data.list.products]
      navigation.setParams({ listObj: data.list })
    } catch (e) {
      console.error('Save changes error:', e)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(_, i) => `prod_${i}`}
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            removeProduct={p => {
              const filtered = products.filter(x => x !== p)
              setProducts(filtered)
              setListObj({ ...listObj, products: filtered })
              navigation.setParams({ listObj: { ...listObj, products: filtered } })
            }}
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
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
            Save Changes
          </Text>
        </TouchableHighlight>
      </View>
    </SafeAreaView>
  )
}
