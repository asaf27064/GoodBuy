import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native'
import {
  Searchbar,
  IconButton,
  useTheme
} from 'react-native-paper'
import debounce from 'lodash/debounce'
import axios from 'axios'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_MARGIN = 8
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2  // two columns

export default function AddItemScreen({ route, navigation }) {
  const theme = useTheme()
  const { listObj } = route.params

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'

  const doSearch = useCallback(
    debounce(async term => {
      if (!term.trim()) {
        setResults([])
        return
      }
      try {
        const { data } = await axios.get(`/api/Products/search/${term}`)
        setResults(data.results)
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

  const Thumbnail = ({ uri, style }) => {
    const [error, setError] = useState(false)
    if (!uri || error) {
      return (
        <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceVariant }]}>
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
        style={style}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    )
  }

  const renderListItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listRow}
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
      <Thumbnail uri={item.imageUrl} style={styles.listThumb} />
      <View style={styles.listText}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {item.itemName}
        </Text>
        <Text style={{ color: theme.colors.onBackgroundDisabled }}>
          Code: {item.itemCode}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderCardItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.cardContainer, { backgroundColor: theme.colors.surface }]}
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
      <Thumbnail uri={item.imageUrl} style={styles.cardImage} />
      <Text
        style={[styles.cardTitle, { color: theme.colors.onBackground }]}
        numberOfLines={2}
      >
        {item.itemName}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search for item"
          onChangeText={onChange}
          value={query}
          style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
        />
        <IconButton
          icon={viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted'}
          size={24}
          color={theme.colors.onSurface}
          onPress={() =>
            setViewMode(prev => (prev === 'list' ? 'grid' : 'list'))
          }
        />
      </View>

      <FlatList
        key={viewMode}
        data={results}
        keyExtractor={(item, i) => `${item.itemCode}_${i}`}
        renderItem={viewMode === 'list' ? renderListItem : renderCardItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        numColumns={viewMode === 'grid' ? 2 : 1}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  searchbar: {
    flex: 1,
    elevation: 2
  },
  list: {
    paddingBottom: 16
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  listThumb: {
    width: 48,
    height: 48,
    borderRadius: 4
  },
  listText: {
    marginLeft: 12,
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '500'
  },
  cardContainer: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    borderRadius: 8,
    elevation: 2,
    padding: 8
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
    borderRadius: 4,
    backgroundColor: '#eee'
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500'
  }
})
