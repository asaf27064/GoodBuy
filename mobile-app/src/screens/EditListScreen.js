import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react'
import { SafeAreaView, FlatList, View, Text, ActivityIndicator } from 'react-native'
import { useTheme, IconButton } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import ProductListItem from '../components/EditListScreenItem'
import { useAuth } from '../contexts/AuthContext'
import io from 'socket.io-client'
import { API_BASE } from '../config'
import axios from 'axios'

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { user, token } = useAuth()
  
  const { listObj: initialList } = route.params
  const [products, setProducts] = useState(initialList?.products || [])
  const [isSaving, setIsSaving] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const [isOnline, setIsOnline] = useState(false)
  
  const initialRef = useRef([...initialList?.products || []])
  const socketRef = useRef(null)
  const hasJoinedRef = useRef(false)
  const listId = initialList?._id

  // Initialize socket connection for this list only
  useEffect(() => {
    if (!listId || !user || !token || hasJoinedRef.current) return

    console.log(`🔌 Connecting to real-time for list: ${initialList.title}`)
    
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket']
    })
    
    socketRef.current = socket
    hasJoinedRef.current = true

    socket.on('connect', () => {
      console.log('✅ Real-time connected')
      setIsOnline(true)
      
      // Join this specific list
      socket.emit('join-list', {
        listId,
        userId: user.id,
        userName: user.username || user.email,
        clientId: `${user.id}_${Date.now()}`
      })
    })

    socket.on('disconnect', () => {
      console.log('🔌 Real-time disconnected')
      setIsOnline(false)
    })

    // Listen for active users
    socket.on('active-users-update', (data) => {
      if (data.listId === listId) {
        setActiveUsers(data.users || [])
      }
    })

    // Listen for real-time list updates
    socket.on('operation-applied', (data) => {
      if (data.listId === listId && data.appliedBy.userId !== user.id) {
        console.log(`📥 Real-time update from ${data.appliedBy.userName}`)
        
        // Apply the server's new state directly
        setProducts(data.newState.products || [])
        initialRef.current = [...(data.newState.products || [])]
        
        console.log(`✅ Applied remote changes from ${data.appliedBy.userName}`)
      }
    })

    socket.on('list-state', (data) => {
      if (data.list._id === listId) {
        console.log('📋 Received initial list state')
        setProducts(data.list.products || [])
        initialRef.current = [...(data.list.products || [])]
        setActiveUsers(data.activeUsers || [])
      }
    })

    return () => {
      if (socket) {
        socket.emit('leave-list', { listId, userId: user.id })
        socket.disconnect()
      }
      hasJoinedRef.current = false
    }
  }, [listId, user?.id, token, initialList.title])

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
        
        // Clear the addedItem param immediately
        navigation.setParams({ addedItem: undefined })
      }
    }, [route.params?.addedItem, navigation])
  )

  const diffLog = (oldList, newList) => {
    const CurrentUser = user?.username || user?.email
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

  // Auto-save with real-time broadcasting
  const autoSave = useCallback(async (currentProducts, currentListObj) => {
    const changes = diffLog(initialRef.current, currentProducts)
    
    if (changes.length === 0) return

    console.log('Auto-saving changes:', changes.length, 'edits')
    setIsSaving(true)
    
    const payload = {
      list: { ...currentListObj, products: currentProducts, editLog: [...(currentListObj.editLog || []), ...changes] },
      changes,
      userId: user.id,
      userName: user.username || user.email
    }

    try {
      const { data } = await axios.put(`/api/ShoppingLists/${currentListObj._id}`, payload)
      const updated = data.list || data
      
      initialRef.current = [...(updated.products || [])]
      
      // Broadcast to other users via socket
      if (socketRef.current && isOnline) {
        socketRef.current.emit('list-change', {
          listId: currentListObj._id,
          newState: {
            products: updated.products,
            title: updated.title
          },
          appliedBy: {
            userId: user.id,
            userName: user.username || user.email
          },
          changes
        })
      }
      
      console.log('Auto-save successful with real-time broadcast')
      
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [user, isOnline])

  // Auto-save when products change
  useEffect(() => {
    const hasChanges = products.length !== initialRef.current.length || 
                      JSON.stringify(products) !== JSON.stringify(initialRef.current)
    
    if (hasChanges) {
      console.log('Changes detected, auto-saving with real-time...')
      autoSave(products, initialList)
    }
  }, [products, autoSave, initialList])

  // Header configuration
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate('My Shopping Lists')}
        />
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Connection status */}
          {!isOnline && (
            <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 8, height: 8, borderRadius: 4, 
                backgroundColor: '#FF9800', marginRight: 4 
              }} />
              <Text style={{ 
                color: theme.colors.onPrimary, 
                fontSize: 12,
                opacity: 0.8 
              }}>
                Offline
              </Text>
            </View>
          )}
          
          {/* Active users */}
          {isOnline && activeUsers.length > 0 && (
            <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 8, height: 8, borderRadius: 4, 
                backgroundColor: '#4CAF50', marginRight: 4 
              }} />
              <Text style={{ 
                color: theme.colors.onPrimary, 
                fontSize: 12,
                opacity: 0.8 
              }}>
                {activeUsers.length + 1} online
              </Text>
            </View>
          )}
          
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
            onPress={() => navigation.navigate('AddItem', { 
              listObj: { ...initialList, products } 
            })}
          />
        </View>
      )
    })
  }, [navigation, theme, isSaving, products, initialList, isOnline, activeUsers])

  // Remove product function
  const removeProduct = useCallback((productToRemove) => {
    setProducts(prevProducts => {
      return prevProducts.filter(x => x !== productToRemove)
    })
  }, [])

  // Update quantity function
  const updateProductQuantity = useCallback((productToUpdate, newQuantity) => {
    setProducts(prevProducts => {
      return prevProducts.map(p => 
        p === productToUpdate 
          ? { ...p, numUnits: newQuantity }
          : p
      )
    })
  }, [])

  // Render item
  const renderItem = ({ item }) => (
    <ProductListItem
      product={item}
      removeProduct={removeProduct}
      updateQuantity={updateProductQuantity}
    />
  )

  console.log('Rendering real-time EditListScreen with', products.length, 'products')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Active users indicator */}
      {isOnline && activeUsers.length > 0 && (
        <View style={{
          padding: 8,
          backgroundColor: theme.colors.primaryContainer,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Text style={{ 
            color: theme.colors.onPrimaryContainer,
            fontSize: 12,
            fontWeight: '500'
          }}>
            🤝 Also editing: {activeUsers.map(u => u.userName).join(', ')}
          </Text>
        </View>
      )}
      
      <FlatList
        data={products}
        keyExtractor={(item, index) => `${item.product.itemCode}_${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ 
          padding: 8,
          paddingBottom: insets.bottom + 16 
        }}
      />
      
      {/* Status footer */}
      <View style={{
        padding: 8,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderColor: theme.colors.outline,
        paddingBottom: insets.bottom + 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            width: 8, 
            height: 8, 
            borderRadius: 4, 
            backgroundColor: isOnline ? '#4CAF50' : '#FF9800',
            marginRight: 8 
          }} />
          <Text style={{ 
            fontSize: 12,
            color: theme.colors.onSurface,
            opacity: 0.7
          }}>
            {isOnline ? 'Real-time connected' : 'Offline mode'}
          </Text>
        </View>

        <Text style={{ 
          fontSize: 12,
          color: theme.colors.onSurface,
          opacity: 0.7
        }}>
          {products.length} items
        </Text>
      </View>
      
      {isSaving && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 80,
          left: 0,
          right: 0,
          padding: 8,
          backgroundColor: theme.colors.surfaceVariant,
          borderTopWidth: 1,
          borderColor: theme.colors.outline,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
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