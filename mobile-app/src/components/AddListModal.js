// Alternative approach - use this if the current modal still has issues
// This creates a portal that renders outside the normal component tree

import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
  Dimensions
} from 'react-native'
import axios from 'axios'
import { useTheme, Portal } from 'react-native-paper'
import globalStylesFactory from '../styles/globalStyles'
import { useAuth } from '../contexts/AuthContext'

const { height: screenHeight, width: screenWidth } = Dimensions.get('window')

export default function AddListModal({ isVisible, onClose, createList }) {
  const theme = useTheme()
  const gs = globalStylesFactory(theme)
  const { user } = useAuth()

  const [titleText, setTitleText] = useState('')
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [important, setImportant] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    axios
      .get('/api/Users')
      .then(({ data }) => {
        const filtered = Array.isArray(data)
          ? data.filter(u => String(u._id) !== String(user?.id))
          : []
        setUsers(filtered)
      })
      .catch(console.error)
  }, [isVisible, user?.id])

  const toggleUser = id =>
    setSelected(s =>
      s.includes(id) ? s.filter(x => x !== id) : [...s, id]
    )

  const onSubmit = () => {
    const memberIds = Array.from(new Set([...(selected || []), user.id]))
    createList(titleText, memberIds, important)
    setTitleText('')
    setSelected([])
    setImportant(false)
    onClose()
  }

  if (!isVisible) return null

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <TouchableHighlight 
            onPress={onClose} 
            style={styles.closeButton}
            underlayColor={theme.colors.surfaceVariant}
          >
            <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>✕</Text>
          </TouchableHighlight>

          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Create New List
          </Text>

          <TextInput
            placeholder="List name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={titleText}
            onChangeText={setTitleText}
            style={[styles.input, { 
              borderBottomColor: theme.colors.outline,
              color: theme.colors.onSurface
            }]}
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Members
          </Text>
          
          <View style={styles.userListContainer}>
            <FlatList
              data={users}
              keyExtractor={u => u._id}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <Text style={{ 
                  color: theme.colors.onSurfaceVariant, 
                  textAlign: 'center', 
                  padding: 20 
                }}>
                  No other users found.
                </Text>
              }
              renderItem={({ item }) => {
                const isSel = selected.includes(item._id)
                return (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => toggleUser(item._id)}
                  >
                    <View
                      style={[styles.checkbox, {
                        borderColor: theme.colors.primary,
                        backgroundColor: isSel ? theme.colors.primary : 'transparent'
                      }]}
                    />
                    <Text style={{ 
                      marginLeft: 8, 
                      color: theme.colors.onSurface,
                      flex: 1 
                    }}>
                      {item.username || item.email}
                    </Text>
                  </TouchableOpacity>
                )
              }}
            />
          </View>

          <TouchableOpacity 
            style={styles.importantRow}
            onPress={() => setImportant(b => !b)}
          >
            <View style={[styles.checkbox, {
              borderColor: theme.colors.primary,
              backgroundColor: important ? theme.colors.primary : 'transparent'
            }]} />
            <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>
              Important List
            </Text>
          </TouchableOpacity>

          <TouchableHighlight 
            onPress={onSubmit} 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            disabled={!titleText.trim()}
          >
            <Text style={{ 
              color: theme.colors.onPrimary,
              fontWeight: '600',
              opacity: titleText.trim() ? 1 : 0.5
            }}>
              Create List
            </Text>
          </TouchableHighlight>
        </View>
      </View>
    </Portal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    padding: 24,
    borderRadius: 16,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 20,
    paddingVertical: 8,
    fontSize: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    fontSize: 14,
  },
  userListContainer: {
    maxHeight: 180,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4
  },
  importantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  }
})