import React, { useState } from 'react'
import axios from 'axios'
import { View, FlatList, SafeAreaView, TouchableHighlight } from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ShoppingListScreenItem from '../components/ShoppingListScreenItem'
import AddListModal from '../components/AddListModal'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import CheckListScreen from './CheckListScreen'
import EditListScreen from './EditListScreen'
import EditHistoryScreen from './EditHistoryScreen'
import RecommendationScreen from './RecommendationsScreen'
import PriceComparisonScreen from './PriceComparisonScreen'

MaterialCommunityIcons.loadFont()
const Stack = createNativeStackNavigator()

export function ShoppingListStack() {
  const theme = useTheme()
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <MaterialCommunityIcons.Button
            name="menu"
            size={24}
            color={theme.colors.onPrimary}
            backgroundColor={theme.colors.primary}
            onPress={() => navigation.openDrawer()}
            iconStyle={{ marginRight: 0 }}
            style={{ paddingHorizontal: 16 }}
          />
        )
      })}
    >
      <Stack.Screen name="MyShoppingLists" component={ShoppingListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CheckItems"
        component={CheckListScreen}
        options={({ route }) => ({ title: `${route.params.listObj.title}: Check Items` })}
      />
      <Stack.Screen
        name="EditItems"
        component={EditListScreen}
        options={({ route }) => ({ title: `${route.params.listObj.title}: Edit List` })}
      />
      <Stack.Screen
        name="EditHistory"
        component={EditHistoryScreen}
        options={({ route }) => ({ title: `${route.params.listObj.title}: Edit History` })}
      />
      <Stack.Screen
        name="Recommend"
        component={RecommendationScreen}
        options={({ route }) => ({ title: `${route.params.listObj.title}: Suggestions` })}
      />
      <Stack.Screen
        name="Compare"
        component={PriceComparisonScreen}
        options={({ route }) => ({ title: `${route.params.listObj.title}: Price Comparison` })}
      />
    </Stack.Navigator>
  )
}

function ShoppingListScreen({ navigation }) {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const insets = useSafeAreaInsets()

  const [isModalVisible, setModalVisible] = useState(false)
  const [shoppingLists, setShoppingLists] = useState([])

  const addList = () => setModalVisible(true)
  const handleCloseModal = () => setModalVisible(false)

  const createNewList = async (title, memberIds, important) => {
    try {
      const { data } = await axios.post('/api/ShoppingLists', {
        title,
        members: memberIds,
        importantList: important
      })
      setShoppingLists(prev => [...prev, data])
      handleCloseModal()
    } catch (err) {
      console.error('Error creating list:', err)
    }
  }

  const renderItem = ({ item }) => (
    <View style={localStyles.shopList}>
      <ShoppingListScreenItem listObj={item} navigation={navigation} />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <AddListModal isVisible={isModalVisible} onClose={handleCloseModal} createList={createNewList} />

      <FlatList
        data={shoppingLists}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        ListFooterComponent={<View />}
        ListFooterComponentStyle={{ height: 120, justifyContent: 'flex-end' }}
      />

      <TouchableHighlight
        onPress={addList}
        style={[
          localStyles.addListBtn,
          {
            bottom: insets.bottom + 20,
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary
          }
        ]}
        underlayColor={theme.colors.surface}
      >
        <MaterialCommunityIcons name="plus" color={theme.colors.onPrimary} size={28} />
      </TouchableHighlight>
    </SafeAreaView>
  )
}

export default ShoppingListScreen

const localStyles = {
  shopList: {
    flex: 1,
    borderRadius: 10,
    margin: 10,
    backgroundColor: 'pink'
  },
  addListBtn: {
    position: 'absolute',
    right: 20,
    padding: 16,
    borderWidth: 2,
    borderRadius: 20,
    alignItems: 'center'
  }
}
