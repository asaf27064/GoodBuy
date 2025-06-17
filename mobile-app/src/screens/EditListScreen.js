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

function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms) } }

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { listObj: init } = route.params
  const [listObj, setListObj] = useState(init)
  const [products, setProducts] = useState(init.products || [])
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { joinList, leaveList, startEdit, stopEdit, on, off, editingUsers } = useListSocket()
  const pendingMap = useRef(new Map())

  const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

  const pushChange = c => {
    const ackId = rand()
    pendingMap.current.set(ackId, { change: { ...c, ackId }, snapshot: products })
    return ackId
  }

  useEffect(() => {
    joinList(listObj._id)
    startEdit(listObj._id, { username: user.username, listId: listObj._id })
    const hUpd = data => { if (data._id === listObj._id) { setListObj(data); setProducts(data.products || []) } }
    const hAck = a => { if (pendingMap.current.has(a.ackId)) { if (a.status === 'error') { const snap = pendingMap.current.get(a.ackId).snapshot; setProducts(snap) } pendingMap.current.delete(a.ackId) } }
    on('listUpdated', hUpd)
    on('listAck', hAck)
    return () => { off('listUpdated', hUpd); off('listAck', hAck); stopEdit(listObj._id, { username: user.username, listId: listObj._id }); leaveList(listObj._id) }
  }, [listObj._id, joinList, leaveList, startEdit, stopEdit, on, off, user.username])

  useFocusEffect(
    useCallback(() => {
      const add = route.params?.addedItem
      if (add) {
        setProducts(p => { if (p.some(x => x.product.itemCode === add.itemCode)) return p; return [...p, { product: add, numUnits: 1 }] })
        const ackId = pushChange({ action: 'added', product: add, timeStamp: new Date(), changedBy: user.username })
        saveChangesDebounced(ackId)
        navigation.setParams({ addedItem: undefined })
      }
    }, [route.params?.addedItem, navigation, user.username])
  )

  const saveChanges = async ackId => {
    const entry = pendingMap.current.get(ackId)
    if (!entry) return
    setSaving(true)
    try { await axios.put(`/api/ShoppingLists/${listObj._id}`, { changes: [entry.change] }) } catch { pendingMap.current.delete(ackId); setProducts(entry.snapshot) } finally { setSaving(false) }
  }

  const saveChangesDebounced = useCallback(debounce(id => saveChanges(id), 120), [])

  const removeProduct = useCallback(item => {
    const ackId = pushChange({ action: 'removed', product: item.product, timeStamp: new Date(), changedBy: user.username })
    setProducts(p => p.filter(x => x !== item))
    saveChangesDebounced(ackId)
  }, [saveChangesDebounced, user.username])

  const updateQty = useCallback((item, qty) => {
    const diff = qty - item.numUnits
    if (!diff) return
    const ackId = pushChange({ action: 'updated', product: item.product, difference: diff, timeStamp: new Date(), changedBy: user.username })
    setProducts(p => p.map(x => (x === item ? { ...x, numUnits: qty } : x)))
    saveChangesDebounced(ackId)
  }, [saveChangesDebounced, user.username])

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
