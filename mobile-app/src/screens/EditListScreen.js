import React, { useState, useRef, useLayoutEffect, useEffect } from 'react'
import axios from 'axios'
import { SafeAreaView, FlatList, View, Text, TouchableHighlight, Alert } from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

  useEffect(() => {
    const added = route.params?.addedItem
    if (added) {
      const newEntry = { product: added, numUnits: 1 }
      const newProducts = [...products, newEntry]
      const updatedList = { ...listObj, products: newProducts }
      setProducts(newProducts)
      setListObj(updatedList)
      navigation.setParams({ addedItem: undefined, listObj: updatedList })
    }
  }, [route.params?.addedItem])

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
  const payload = {
    list: { ...listObj, products, editLog: [ ...(listObj.editLog || []), ...changes ] },
    changes
  }

  try {
    const { data } = await axios.put(`/api/ShoppingLists/${listObj._id}`, payload)
    const updated = data.list || data
    setListObj(updated)
    setProducts(updated.products || [])
    initialRef.current = [ ...(updated.products || []) ]
    Alert.alert('Success', 'List saved successfully')
    navigation.goBack()
  } catch (e) {
    Alert.alert('Save Failed', JSON.stringify(e.response?.data || e.message, null, 2), [{ text: 'OK' }])
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
              const updatedList = { ...listObj, products: filtered }
              setProducts(filtered)
              setListObj(updatedList)
              navigation.setParams({ listObj: updatedList })
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
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Save Changes</Text>
        </TouchableHighlight>
      </View>
    </SafeAreaView>
  )
}
