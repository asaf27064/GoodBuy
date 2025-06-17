import React, { useState, useEffect, useMemo } from 'react'
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
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
  const [searchText, setSearchText] = useState('')

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

  useEffect(() => {
    if (!isVisible) {
      setSearchText('')
    }
  }, [isVisible])

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return users
    
    const searchLower = searchText.toLowerCase()
    return users.filter(u => {
      const username = (u.username || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return username.includes(searchLower) || email.includes(searchLower)
    })
  }, [users, searchText])

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
    setSearchText('')
    onClose()
  }

  const handleClose = () => {
    setTitleText('')
    setSelected([])
    setImportant(false)
    setSearchText('')
    onClose()
  }

  if (!isVisible) return null

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <TouchableHighlight 
            onPress={handleClose} 
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

          {/* Search Input */}
          <View style={[styles.searchContainer, { borderColor: theme.colors.outline }]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search users by username or email..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchText}
              onChangeText={setSearchText}
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={20} 
                  color={theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <View style={styles.userListContainer}>
            <FlatList
              data={filteredUsers}
              keyExtractor={u => u._id}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <Text style={{ 
                  color: theme.colors.onSurfaceVariant, 
                  textAlign: 'center', 
                  padding: 20 
                }}>
                  {searchText ? 'No users found matching your search.' : 'No other users found.'}
                </Text>
              }
              renderItem={({ item }) => {
                const isSel = selected.includes(item._id)
                const displayName = item.username || item.email
                const secondaryText = item.username ? item.email : null
                
                return (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => toggleUser(item._id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.checkbox, {
                        borderColor: theme.colors.primary,
                        backgroundColor: isSel ? theme.colors.primary : 'transparent'
                      }]}
                    >
                      {isSel && (
                        <MaterialCommunityIcons 
                          name="check" 
                          size={14} 
                          color={theme.colors.onPrimary} 
                        />
                      )}
                    </View>
                    
                    <View style={styles.userInfo}>
                      <Text style={{ 
                        color: theme.colors.onSurface,
                        fontSize: 14,
                        fontWeight: '500'
                      }}>
                        {displayName}
                      </Text>
                      {secondaryText && (
                        <Text style={{ 
                          color: theme.colors.onSurfaceVariant,
                          fontSize: 12,
                          marginTop: 2
                        }}>
                          {secondaryText}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          </View>

          {/* Show selected count */}
          {selected.length > 0 && (
            <Text style={[styles.selectedCount, { color: theme.colors.primary }]}>
              {selected.length} member{selected.length !== 1 ? 's' : ''} selected
            </Text>
          )}

          <TouchableOpacity 
            style={styles.importantRow}
            onPress={() => setImportant(b => !b)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, {
              borderColor: theme.colors.primary,
              backgroundColor: important ? theme.colors.primary : 'transparent'
            }]}>
              {important && (
                <MaterialCommunityIcons 
                  name="check" 
                  size={14} 
                  color={theme.colors.onPrimary} 
                />
              )}
            </View>
            <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>
              Important List
            </Text>
          </TouchableOpacity>

          <TouchableHighlight 
            onPress={onSubmit} 
            style={[
              styles.button, 
              { 
                backgroundColor: titleText.trim() ? theme.colors.primary : theme.colors.surfaceVariant,
                opacity: titleText.trim() ? 1 : 0.6
              }
            ]}
            disabled={!titleText.trim()}
            underlayColor={theme.colors.primaryContainer}
          >
            <Text style={{ 
              color: titleText.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
              fontWeight: '600'
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
    width: screenWidth * 0.9,
    maxWidth: 420,
    maxHeight: screenHeight * 0.85,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  userListContainer: {
    maxHeight: 200,
    marginBottom: 16,
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
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  selectedCount: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
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