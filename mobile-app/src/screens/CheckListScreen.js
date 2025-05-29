import React, { useState } from 'react'
import {
  View,
  FlatList,
  Text,
  SafeAreaView,
  TouchableHighlight
} from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ProductCheckListItem from '../components/CheckListScreenItem'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

MaterialCommunityIcons.loadFont()

export default function CheckListScreen({ route }) {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const insets = useSafeAreaInsets()

  const currList = route.params.list.listObj
  const [checkedProducts, setCheckedProducts] = useState(new Set())

  const uncheckedItems = currList.products.filter(
    p => !checkedProducts.has(p.product._id)
  )
  const checkedItems = currList.products.filter(p =>
    checkedProducts.has(p.product._id)
  )

  const handleCheck = item => {
    // … your existing logic
  }

  const renderItem = ({ item }) => (
    <ProductCheckListItem
      product={item}
      checkStatus={checkedProducts.has(item.product._id)}
      handleCheck={handleCheck}
    />
  )

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Products to buy:</Text>
      <FlatList
        data={uncheckedItems}
        keyExtractor={i => i.product._id}
        renderItem={renderItem}
      />
      {checkedItems.length > 0 && (
        <>
          <Text style={styles.headerText}>Products bought:</Text>
          <FlatList
            data={checkedItems}
            keyExtractor={i => i.product._id}
            renderItem={renderItem}
          />
        </>
      )}
      <TouchableHighlight
        style={[
          styles.addListBtn,
          {
            bottom: insets.bottom + 60 + 10,
            backgroundColor: theme.colors.secondary
          }
        ]}
        onPress={() => {/* finish logic */}}
      >
        <Text style={styles.text}>Finish Purchase</Text>
      </TouchableHighlight>
    </SafeAreaView>
  )
}
