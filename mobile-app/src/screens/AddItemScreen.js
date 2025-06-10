// mobile-app/src/screens/AddItemScreen.js

import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native'
import { Searchbar, useTheme } from 'react-native-paper'
import debounce from 'lodash/debounce'
import axios from 'axios'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

export default function AddItemScreen({ route, navigation }) {
  const theme = useTheme()
  const { listObj } = route.params
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  // Debounced search
  const doSearch = useCallback(
    debounce(async term => {
      if (!term.trim()) {
        setResults([])
        return
      }
      try {
        const { data } = await axios.get(`/api/Products/search/${term}`)
        setResults(data.results) // each has itemCode, itemName, imageUrl
      } catch (e) {
        console.error(e)
      }
    }, 300),
    []
  )

  const onChange = text => {
    setQuery(text)
    doSearch(text)
  }

  // Thumbnail with fallback icon
  const Thumbnail = ({ uri }) => {
    const [error, setError] = useState(false)
    if (!uri || error) {
      return (
        <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons
            name="image-off-outline"
            size={24}
            color={theme.colors.onSurfaceDisabled}
          />
        </View>
      )
    }
    return (
      <Image
        source={{ uri }}
        style={styles.thumb}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    )
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        navigation.replace('EditItems', {
          listObj,
          addedItem: {
            itemCode: item.itemCode,
            name:     item.itemName,
            image:    item.imageUrl,
            numUnits: 1
          }
        })
      }
    >
      <Thumbnail uri={item.imageUrl} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {item.itemName}
        </Text>
        <Text style={{ color: theme.colors.onBackgroundDisabled }}>
          Code: {item.itemCode}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search for item"
        onChangeText={onChange}
        value={query}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
      />
      <FlatList
        data={results}
        keyExtractor={(item, i) => `${item.itemCode}_${i}`}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  searchbar: {
    margin: 8,
    elevation: 2
  },
  list: {
    paddingBottom: 16
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 4
  },
  textContainer: {
    marginLeft: 12,
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '500'
  }
})
