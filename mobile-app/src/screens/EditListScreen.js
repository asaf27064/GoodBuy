import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import axios from 'axios'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator } from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import ProductListItem from '../components/EditListScreenItem'
import { useAuth } from '../contexts/AuthContext'
import { useListSocket } from '../contexts/ListSocketContext'
import { API_BASE } from '../config'
axios.defaults.baseURL = API_BASE

function debounce(f, ms) {
  let t
  return (...a) => {
    clearTimeout(t)
    t = setTimeout(() => f(...a), ms)
  }
}

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { listObj: init } = route.params
  const [listObj, setListObj] = useState(init)
  const [products, setProducts] = useState(init.products || [])
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { joinList, leaveList, startEdit, stopEdit, on, off, editingUsers } = useListSocket()
  const pendingRef = useRef([])

  const pushChange = c => pendingRef.current.push(c)

  useEffect(() => {
    joinList(listObj._id)
    startEdit(listObj._id, { username: user.username, listId: listObj._id })
    const handle = data => {
      if (data._id !== listObj._id) return
      setListObj(data)
      setProducts(data.products || [])
    }
    on('listUpdated', handle)
    return () => {
      off('listUpdated', handle)
      stopEdit(listObj._id, { username: user.username, listId: listObj._id })
      leaveList(listObj._id)
    }
  }, [listObj._id, joinList, leaveList, startEdit, stopEdit, on, off, user.username])

  useFocusEffect(
    useCallback(() => {
      const added = route.params?.addedItem
      if (added) {
        setProducts(p => {
          if (p.some(x => x.product.itemCode === added.itemCode)) return p
          pushChange({ action: 'added', product: added, timeStamp: new Date(), changedBy: user.username })
          return [...p, { product: added, numUnits: 1 }]
        })
        navigation.setParams({ addedItem: undefined })
      }
    }, [route.params?.addedItem, navigation, user.username])
  )

  const saveChanges = async () => {
    const changes = pendingRef.current
    if (!changes.length) return
    setSaving(true)
    pendingRef.current = []
    try {
      await axios.put(`/api/ShoppingLists/${listObj._id}`, { changes })
    } catch (e) {
      console.error(e)
      pendingRef.current.unshift(...changes)
    } finally {
      setSaving(false)
    }
  }

  const debouncedSave = useCallback(debounce(saveChanges, 150), [])

  const removeProduct = useCallback(item => {
    setProducts(p => p.filter(x => x !== item))
    pushChange({ action: 'removed', product: item.product, timeStamp: new Date(), changedBy: user.username })
    debouncedSave()
  }, [debouncedSave, user.username])

  const updateQty = useCallback((item, qty) => {
    setProducts(p => p.map(x => (x === item ? { ...x, numUnits: qty } : x)))
    const diff = qty - item.numUnits
    if (diff)
      pushChange({ action: 'updated', product: item.product, difference: diff, timeStamp: new Date(), changedBy: user.username })
    debouncedSave()
  }, [debouncedSave, user.username])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <IconButton icon="arrow-left" color={theme.colors.onPrimary} onPress={() => navigation.navigate('My Shopping Lists')} />,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {saving && <ActivityIndicator size={16} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />}
          <IconButton icon="plus" color={theme.colors.onPrimary} onPress={() => navigation.navigate('AddItem', { listObj })} />
        </View>
      )
    })
  }, [navigation, theme.colors.onPrimary, listObj, saving])

  useEffect(() => { if (pendingRef.current.length) debouncedSave() }, [products, debouncedSave])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(item, i) => `${item.product.itemCode}_${i}`}
        renderItem={({ item }) => <ProductListItem product={item} removeProduct={removeProduct} updateQuantity={updateQty} />}
        contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 16 }}
      />
      {saving && (
        <View style={{ padding: 8, backgroundColor: theme.colors.surfaceVariant, borderTopWidth: 1, borderColor: theme.colors.outline, paddingBottom: insets.bottom + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>Saving...</Text>
        </View>
      )}
      {editingUsers[listObj._id]?.length > 0 && (
        <View style={{ position: 'absolute', top: 0, width: '100%', alignItems: 'center', padding: 4, backgroundColor: theme.colors.inverseOnSurface }}>
          <Text style={{ color: theme.colors.inverseSurface, fontSize: 12 }}>{editingUsers[listObj._id].join(', ')} editing now</Text>
        </View>
      )}
    </SafeAreaView>
  )
}
