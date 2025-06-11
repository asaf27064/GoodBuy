import React, { useState } from 'react'
import axios from 'axios'
import {
  SafeAreaView,
  FlatList,
  Text,
  TouchableHighlight,
  Alert
} from 'react-native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import makeGlobalStyles from '../styles/globalStyles'
import ProductCheckListItem from '../components/CheckListScreenItem'
import ConfirmPurchaseModal from '../components/ConfirmPurchaseModal'
import { API_BASE } from '../config'

export default function CheckListScreen({ route, navigation }) {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const insets = useSafeAreaInsets()

  const listObj = route.params.listObj
  const [checkedSet, setCheckedSet] = useState(new Set())
  const [modalVisible, setModalVisible] = useState(false)

  const unchecked = listObj.products.filter(p => !checkedSet.has(p.product.itemCode))
  const checked   = listObj.products.filter(p =>  checkedSet.has(p.product.itemCode))

  const toggle = item => {
    const next = new Set(checkedSet)
    const code = item.product.itemCode
    next.has(code) ? next.delete(code) : next.add(code)
    setCheckedSet(next)
  }

  const finishPurchase = async items => {
    try {
      await axios.post(`${API_BASE}/api/Purchases`, {
        listId:            listObj._id,
        timestamp:         Date.now(),
        purchasedProducts: items.map(({ product, numUnits }) => ({ product, numUnits }))
      })
      Alert.alert('Success', 'Purchase recorded and list cleared.')
      setCheckedSet(new Set())
      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message)
    } finally {
      setModalVisible(false)
    }
  }

  const renderItem = ({ item }) => (
    <ProductCheckListItem
      product={item}
      checkStatus={checkedSet.has(item.product.itemCode)}
      handleCheck={() => toggle(item)}
    />
  )

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmPurchaseModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        purchasedItems={checked}
        handlePurchase={finishPurchase}
        allCheckedFlag={unchecked.length === 0}
      />

      <Text style={styles.headerText}>Products to buy:</Text>
      <FlatList
        data={unchecked}
        keyExtractor={(item, idx) => `${item.product.itemCode}-${idx}`}
        renderItem={renderItem}
      />

      {checked.length > 0 && (
        <>
          <Text style={styles.headerText}>Products bought:</Text>
          <FlatList
            data={checked}
            keyExtractor={(item, idx) => `${item.product.itemCode}-${idx}`}
            renderItem={renderItem}
          />
        </>
      )}

      <TouchableHighlight
        style={[
          styles.addListBtn,
          { bottom: insets.bottom + 70, backgroundColor: theme.colors.secondary }
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.text}>Finish Purchase</Text>
      </TouchableHighlight>
    </SafeAreaView>
  )
}
