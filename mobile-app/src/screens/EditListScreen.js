import React, { useState, useRef } from 'react'
import axios from 'axios'
import {
  View,
  FlatList,
  Text,
  Image,
  SafeAreaView,
  TouchableHighlight,
  TextInput,
  StyleSheet,
  Dimensions
} from 'react-native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ProductListItem from '../components/EditListScreenItem'
import debounce from 'lodash/debounce'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

const { height } = Dimensions.get('window')

export default function EditListScreen({ route }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = makeStyles(theme, insets)

  const WAIT_TIME = 300
  const currList = route.params.list.listObj

  const [products, setProducts] = useState(currList.products)
  const initialProducts = useRef(JSON.parse(JSON.stringify(currList.products)))
  const [searchBarInput, setSearchBarInput] = useState('')
  const [searchMatches, setSearchMatches] = useState([])

  const removeProduct = productToRemove => {
    setProducts(products.filter(e => e !== productToRemove))
  }

  const handleInputChange = productName => {
    setSearchBarInput(productName)
    fetchProducts(productName)
  }

  const fetchProducts = debounce(async function (productName) {
    if (productName.trim() === '') {
      setSearchMatches([])
      return
    }
    try {
      const response = await axios.get(`/api/Products/search/${productName}`)
      setSearchMatches(response.data.results)
    } catch (err) {
      console.error('Error getting products:', err)
    }
  }, WAIT_TIME)

  const addNewProduct = newProduct => {
    setProducts([...products, { product: newProduct, numUnits: 1 }])
    setSearchBarInput('')
    setSearchMatches([])
  }

  const compareLists = (oldList, newList) => {
    const editedBy = 'Me'
    let newEdits = []
    oldList.forEach(oldItem => {
      const newItem = newList.find(n => n.product._id === oldItem.product._id)
      if (!newItem) {
        newEdits.push({
          product: oldItem.product,
          changedBy: editedBy,
          action: 'removed',
          timeStamp: new Date()
        })
      } else if (oldItem.numUnits !== newItem.numUnits) {
        newEdits.push({
          product: oldItem.product,
          changedBy: editedBy,
          action: 'updated',
          timeStamp: new Date(),
          diffrence: newItem.numUnits - oldItem.numUnits
        })
      }
    })
    newList.forEach(newItem => {
      const oldItem = oldList.find(o => o.product._id === newItem.product._id)
      if (!oldItem) {
        newEdits.push({
          product: newItem.product,
          changedBy: editedBy,
          action: 'added',
          timeStamp: new Date()
        })
      }
    })
    return newEdits
  }

  const saveProductsChanges = async () => {
    currList.products = products
    const newEditLog = compareLists(initialProducts.current, products)
    currList.editLog = [...currList.editLog, ...newEditLog]
    const data = { list: currList, changes: newEditLog }
    try {
      await axios.put(`/api/ShoppingLists/${currList._id}`, data)
      initialProducts.current = JSON.parse(JSON.stringify(products))
    } catch (err) {
      console.error('Error saving changes:', err)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <ProductListItem product={item} removeProduct={removeProduct} />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topContainer}>
        <View style={styles.itemSearchBar}>
          <TextInput
            placeholder="Search Item..."
            value={searchBarInput}
            onChangeText={handleInputChange}
            style={styles.searchInput}
          />
        </View>
        {searchMatches.length > 0 && (
          <FlatList
            data={searchMatches}
            keyExtractor={i => i._id}
            style={styles.dropList}
            renderItem={({ item }) => (
              <View style={styles.dropListItem}>
                <TouchableHighlight onPress={() => addNewProduct(item)}>
                  <View style={styles.dropListRow}>
                    <Image source={{ uri: item.image }} style={styles.dropListImage} />
                    <Text style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  </View>
                </TouchableHighlight>
              </View>
            )}
          />
        )}
      </View>

      <FlatList data={products} style={styles.prodList} renderItem={renderItem} />

      <View style={[styles.saveChangesBtn, { marginBottom: insets.bottom + 10 }]}>
        <TouchableHighlight onPress={saveProductsChanges}>
          <Text style={{ color: theme.colors.surface }}>Save Changes</Text>
        </TouchableHighlight>
      </View>
    </SafeAreaView>
  )
}

function makeStyles(theme, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    topContainer: {
      margin: 10
    },
    itemSearchBar: {
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
      borderRadius: theme.roundness
    },
    searchInput: {
      flex: 1,
      padding: 8,
      color: theme.colors.onSurface
    },
    dropList: {
      position: 'absolute',
      top: 50,
      width: '100%',
      maxHeight: height / 4,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      zIndex: 1000,
      borderRadius: theme.roundness
    },
    dropListItem: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline
    },
    dropListRow: {
      flexDirection: 'row',
      padding: 10,
      alignItems: 'center'
    },
    dropListImage: {
      marginRight: 10,
      width: '10%',
      aspectRatio: 1
    },
    prodList: {
      margin: 10
    },
    itemContainer: {
      borderRadius: theme.roundness,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary
    },
    saveChangesBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.roundness,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
