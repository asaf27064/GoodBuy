import React, { useState } from 'react'
import axios from 'axios'
import {
  View,
  FlatList,
  StyleSheet,
  TouchableHighlight,
  SafeAreaView
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import globalStyles from '../styles/globalStyles'
import ShoppingList from '../components/ShoppingListScreenItem'
import EditListScreen from './EditListScreen'
import CheckListScreen from './CheckListScreen'
import EditHistoryScreen from './EditHistoryScreen'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AddListModal from '../components/AddListModal'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { COLORS } from '../styles/colors'
import { API_BASE } from '../config'
axios.defaults.baseURL = API_BASE

MaterialCommunityIcons.loadFont()

const Stack = createNativeStackNavigator()

export const ShoppingListStack = () => (
  <Stack.Navigator
    screenOptions={({ navigation }) => ({
      headerStyle: { backgroundColor: COLORS.goodBuyGreen },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: 'bold' },
      headerTitleAlign: 'center',
      headerRight: () => (
        <MaterialCommunityIcons.Button
          name="menu"
          size={28}
          color={COLORS.white}
          backgroundColor={COLORS.goodBuyGreen}
          onPress={() => navigation.openDrawer()}
          iconStyle={{ marginRight: 0 }}
          style={{ paddingHorizontal: 16 }}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        />
      ),
      headerRightContainerStyle: { paddingRight: 0 }
    })}
  >
    <Stack.Screen
      name="MyShoppingLists"
      component={ShoppingListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CheckItems"
      component={CheckListScreen}
      options={({ route }) => ({ title: route.params.list.listObj.title })}
    />
    <Stack.Screen
      name="EditItems"
      component={EditListScreen}
      options={({ route }) => ({ title: route.params.list.listObj.title })}
    />
    <Stack.Screen
      name="EditHistory"
      component={EditHistoryScreen}
      options={({ route }) => ({ title: route.params.list.listObj.title })}
    />
  </Stack.Navigator>
)

export default function ShoppingListScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [isModalVisible, setModalVisible] = useState(false)
  const [shoppingLists, setShoppingLists] = useState([])

  const addList = () => setModalVisible(true)
  const handleCloseModal = () => setModalVisible(false)

  const createNewList = async (title, members, important) => {
    try {
      const { data } = await axios.post(
        '${API_BASE}/api/ShoppingLists',
        { title, members: [members], importantList: important }
      )
      setShoppingLists(prev => [...prev, data])
      handleCloseModal()
    } catch (err) {
      console.error('Error creating list:', err)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.shopList}>
      <ShoppingList
        listObj={item}
        listId={item._id}
        members={item.members}
        title={item.title}
        products={item.products}
        editLog={item.editLog}
        navigation={navigation}
      />
    </View>
  )

  return (
    <SafeAreaView style={globalStyles.container}>
      <AddListModal
        isVisible={isModalVisible}
        onClose={handleCloseModal}
        createList={createNewList}
      />
      <FlatList data={shoppingLists} renderItem={renderItem} />
      <TouchableHighlight
        onPress={addList}
        style={[
          styles.addListBtn,
          {
            bottom: insets.bottom + 60 + 10
          }
        ]}
      >
        <MaterialCommunityIcons name="plus" color={COLORS.white} size={28} />
      </TouchableHighlight>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  shopList: {
    flex: 1,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: 'pink'
  },
  addListBtn: {
    backgroundColor: COLORS.goodBuyGreen,
    position: 'absolute',
    right: 20,
    padding: 20,
    borderRadius: 20,
    zIndex: 10,
    elevation: 10
  }
})
