import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import axios from 'axios'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator } from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import ProductListItem from '../components/EditListScreenItem'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

// Simple debounce function
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { listObj: initialList } = route.params
  const [listObj, setListObj] = useState(initialList)
  const [products, setProducts] = useState(initialList.products || [])
  const [isSaving, setIsSaving] = useState(false)
  const initialRef = useRef([...initialList.products || []])
  const { user } = useAuth()

  // Handle new items from AddItemScreen
  useFocusEffect(
    React.useCallback(() => {
      const addedItem = route.params?.addedItem
      if (addedItem) {
        console.log('Processing added item:', addedItem.name)
        
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

  // Auto-save function
  const autoSave = useCallback(async (currentProducts, currentListObj) => {
    const changes = diffLog(initialRef.current, currentProducts)
    
    // Only save if there are actual changes
    if (changes.length === 0) return

    console.log('Auto-saving changes:', changes.length, 'edits')
    setIsSaving(true)
    
    const payload = {
      list: { ...currentListObj, products: currentProducts, editLog: [...(currentListObj.editLog || []), ...changes] },
      changes
    }

    try {
      const { data } = await axios.put(`/api/ShoppingLists/${currentListObj._id}`, payload)
      const updated = data.list || data
      
      // Update the baseline for future diffs
      initialRef.current = [...(updated.products || [])]
      setListObj(updated)
      console.log('Auto-save successful')
      
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Smart debounced auto-save - 100ms feels instant but batches rapid changes
  const debouncedAutoSave = useCallback(
    debounce((currentProducts, currentListObj) => {
      autoSave(currentProducts, currentListObj)
    }, 100), // 100ms - optimal balance between feeling instant and batching
    [autoSave]
  )

  // Auto-save when products change
  useEffect(() => {
    const hasChanges = products.length !== initialRef.current.length || 
                      JSON.stringify(products) !== JSON.stringify(initialRef.current)
    
    if (hasChanges) {
      console.log('Changes detected, smart auto-saving...')
      debouncedAutoSave(products, listObj)
    }
  }, [products, listObj, debouncedAutoSave])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          color={theme.colors.onPrimary}
          onPress={() => {
            // Always go back to the shopping lists screen
            navigation.navigate('My Shopping Lists')
          }}
        />
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isSaving && (
            <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size={16} color={theme.colors.onPrimary} />
              <Text style={{ 
                color: theme.colors.onPrimary, 
                fontSize: 12, 
                marginLeft: 4,
                opacity: 0.8 
              }}>
                Saving...
              </Text>
            </View>
          )}
          
          <IconButton
            icon="plus"
            color={theme.colors.onPrimary}
            onPress={() =>
              navigation.navigate('AddItem', {
                listObj: { ...listObj, products }
              })
            }
          />
        </View>
      )
    })
  }, [navigation, theme.colors.onPrimary, listObj, products, isSaving])

  const removeProduct = useCallback((productToRemove) => {
    setProducts(prevProducts => {
      const filtered = prevProducts.filter(x => x !== productToRemove)
      setListObj(prevList => ({
        ...prevList,
        products: filtered
      }))
      return filtered
    })
  }, [])

  const updateProductQuantity = useCallback((productToUpdate, newQuantity) => {
    setProducts(prevProducts => {
      const updated = prevProducts.map(p => 
        p === productToUpdate 
          ? { ...p, numUnits: newQuantity }
          : p
      )
      setListObj(prevList => ({
        ...prevList,
        products: updated
      }))
      return updated
    })
  }, [])

  console.log('Rendering EditListScreen with', products.length, 'products')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(item, index) => `${item.product.itemCode}_${index}`}
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            removeProduct={removeProduct}
            updateQuantity={updateProductQuantity}
          />
        )}
        contentContainerStyle={{ 
          padding: 8,
          paddingBottom: insets.bottom + 16 
        }}
      />
      
      {isSaving && (
        <View
          style={{
            padding: 8,
            backgroundColor: theme.colors.surfaceVariant,
            borderTopWidth: 1,
            borderColor: theme.colors.outline,
            paddingBottom: insets.bottom + 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ActivityIndicator size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ 
            fontSize: 12,
            color: theme.colors.onSurfaceVariant
          }}>
            Saving changes...
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}