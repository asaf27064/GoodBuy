import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import axios from 'axios'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator } from 'react-native'
import { useTheme, IconButton, Avatar } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import EditListScreenItem from '../components/EditListScreenItem'
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
  const pushChange = c => { const id = rand(); pendingMap.current.set(id, { change: { ...c, ackId: id }, snapshot: products }); return id }

  useEffect(() => {
    joinList(listObj._id)
    startEdit(listObj._id, { username: user.username, listId: listObj._id })
    const hUpd = d => { if (d._id === listObj._id) { setListObj(d); setProducts(d.products || []) } }
    const hAck = a => { if (pendingMap.current.has(a.ackId)) { if (a.status === 'error') setProducts(pendingMap.current.get(a.ackId).snapshot); pendingMap.current.delete(a.ackId) } }
    on('listUpdated', hUpd); on('listAck', hAck)
    return () => { off('listUpdated', hUpd); off('listAck', hAck); stopEdit(listObj._id, { username: user.username, listId: listObj._id }); leaveList(listObj._id) }
  }, [listObj._id, joinList, leaveList, startEdit, stopEdit, on, off, user.username])

  useFocusEffect(useCallback(() => {
    const add = route.params?.addedItem
    if (add) {
      setProducts(p => (p.some(x => x.product.itemCode === add.itemCode) ? p : [...p, { product: add, numUnits: 1 }]))
      const id = pushChange({ action: 'added', product: add, timeStamp: new Date(), changedBy: user.username })
      saveChangesDebounced(id)
      navigation.setParams({ addedItem: undefined })
    }
  }, [route.params?.addedItem, navigation, user.username]))

  const saveChanges = async id => {
    const e = pendingMap.current.get(id)
    if (!e) return
    setSaving(true)
    try { await axios.put(`/api/ShoppingLists/${listObj._id}`, { changes: [e.change] }) }
    catch { setProducts(e.snapshot) }
    finally { pendingMap.current.delete(id); setSaving(pendingMap.current.size > 0) }
  }
  const saveChangesDebounced = useCallback(debounce(id => saveChanges(id), 120), [])

  const removeProduct = useCallback(item => {
    const id = pushChange({ action: 'removed', product: item.product, timeStamp: new Date(), changedBy: user.username })
    setProducts(p => p.filter(x => x !== item)); saveChangesDebounced(id)
  }, [saveChangesDebounced, user.username])

  const updateQty = useCallback((item, qty) => {
    const diff = qty - item.numUnits; if (!diff) return
    const id = pushChange({ action: 'updated', product: item.product, difference: diff, timeStamp: new Date(), changedBy: user.username })
    setProducts(p => p.map(x => (x === item ? { ...x, numUnits: qty } : x))); saveChangesDebounced(id)
  }, [saveChangesDebounced, user.username])

  const renderItem = useCallback(({ item }) => (
    <EditListScreenItem product={item} removeProduct={removeProduct} updateQuantity={updateQty} />
  ), [removeProduct, updateQty])

  const getItemLayout = useCallback((_, index) => ({ length: 100, offset: 100 * index, index }), [])

  const editors = editingUsers[listObj._id]?.filter(u => u !== user.username) || []
  const EditorBanner = () => (
    editors.length ? (
      <View style={{ position: 'absolute', top: insets.top + 4, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.elevation.level2 }}>
        {editors.slice(0, 3).map((name, i) => (
          <Avatar.Text key={name} size={24} label={name[0].toUpperCase()} style={{ marginLeft: i ? -8 : 0, backgroundColor: theme.colors.primaryContainer }} labelStyle={{ color: theme.colors.onPrimaryContainer, fontSize: 12 }} />
        ))}
        {editors.length > 3 && (
          <Avatar.Text size={24} label={`+${editors.length - 3}`} style={{ marginLeft: -8, backgroundColor: theme.colors.secondaryContainer }} labelStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }} />
        )}
        <Text style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>editing now</Text>
      </View>
    ) : null
  )

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
      <EditorBanner />
      <FlatList
        data={products}
        extraData={products}
        keyExtractor={(item, i) => `${item.product.itemCode}_${i}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        windowSize={10}
        updateCellsBatchingPeriod={20}
        maxToRenderPerBatch={20}
        removeClippedSubviews
        contentContainerStyle={{ padding: 8, paddingTop: insets.top + 44, paddingBottom: insets.bottom + 16 }}
      />
      {saving && (
        <View style={{ padding: 8, backgroundColor: theme.colors.surfaceVariant, borderTopWidth: 1, borderColor: theme.colors.outline, paddingBottom: insets.bottom + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  )
}
