// mobile-app/src/components/AddListModal.js
import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet
} from 'react-native'
import axios from 'axios'
import { useTheme } from 'react-native-paper'
import globalStylesFactory from '../styles/globalStyles'

export default function AddListModal({ isVisible, onClose, createList }) {
  const theme = useTheme()
  const gs = globalStylesFactory(theme)

  const [titleText, setTitleText] = useState('')
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [important, setImportant] = useState(false)

  useEffect(() => {
    if (!isVisible) return
    axios
      .get('/api/Users')
      .then(({ data }) => setUsers(data))
      .catch(console.error)
  }, [isVisible])

  const toggleUser = id =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  const onSubmit = () => {
    createList(titleText, selected, important)
    setTitleText('')
    setSelected([])
    setImportant(false)
    onClose()
  }

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackground}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableHighlight onPress={onClose} style={gs.closeBtn}>
            <Text style={{ color: theme.colors.onSurface }}>Close</Text>
          </TouchableHighlight>

          <TextInput
            placeholder="List name"
            value={titleText}
            onChangeText={setTitleText}
            style={[styles.input, { borderBottomColor: theme.colors.outline || '#ccc' }]}
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Members</Text>
          <FlatList
            data={users}
            keyExtractor={u => u._id}
            style={styles.userList}
            renderItem={({ item }) => {
              const isSel = selected.includes(item._id)
              return (
                <TouchableOpacity style={styles.userRow} onPress={() => toggleUser(item._id)}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: theme.colors.primary,
                        backgroundColor: isSel ? theme.colors.primary : 'transparent'
                      }
                    ]}
                  />
                  <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>
                    {item.username || item.email}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />

          <View style={styles.importantRow}>
            <TouchableOpacity onPress={() => setImportant(b => !b)}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: theme.colors.primary,
                    backgroundColor: important ? theme.colors.primary : 'transparent'
                  }
                ]}
              />
            </TouchableOpacity>
            <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>Important?</Text>
          </View>

          <TouchableHighlight onPress={onSubmit} style={gs.confirmBtn}>
            <Text style={{ color: theme.colors.onPrimary }}>Add List</Text>
          </TouchableHighlight>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContainer: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'stretch'
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingVertical: 4
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8
  },
  userList: {
    maxHeight: 200,
    marginBottom: 16
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4
  },
  importantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  }
})
