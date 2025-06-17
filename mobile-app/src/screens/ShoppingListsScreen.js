import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { View, FlatList, SafeAreaView, TouchableHighlight, ActivityIndicator } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import makeGlobalStyles from '../styles/globalStyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import ShoppingListScreenItem from '../components/ShoppingListScreenItem'
import AddListModal from '../components/AddListModal'
import PriceSyncBanner from '../components/PriceSyncBanner'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import CheckListScreen from './CheckListScreen'
import EditListScreen from './EditListScreen'
import EditHistoryScreen from './EditHistoryScreen'
import RecommendationScreen from './RecommendationsScreen'
import PriceComparisonScreen from './PriceComparisonScreen'
import AddItemScreen from './AddItemScreen'
import { useListSocket } from '../contexts/ListSocketContext'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE
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
      <Stack.Screen name="My Shopping Lists" component={ShoppingListScreen} options={{ headerShown: true }} />
      <Stack.Screen name="CheckItems" component={CheckListScreen} options={({ route }) => ({ title: `${route.params.listObj.title}: Check Items` })} />
      <Stack.Screen name="EditItems" component={EditListScreen} options={({ route }) => ({ title: `${route.params.listObj.title}: Edit List` })} />
      <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
      <Stack.Screen name="EditHistory" component={EditHistoryScreen} options={({ route }) => ({ title: `${route.params.listObj.title}: Edit History` })} />
      <Stack.Screen name="Recommend" component={RecommendationScreen} options={({ route }) => ({ title: `${route.params.listObj.title}: Suggestions` })} />
      <Stack.Screen name="Compare" component={PriceComparisonScreen} options={({ route }) => ({ title: `${route.params.listObj.title}: Price Comparison` })} />
    </Stack.Navigator>
  )
}

export default function ShoppingListScreen({ navigation, route }) {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)
  const insets = useSafeAreaInsets()
  const [isModalVisible, setModalVisible] = useState(false)
  const [shoppingLists, setShoppingLists] = useState([])
  const [loading, setLoading] = useState(true)
  const { on, off } = useListSocket()
  const { user } = useAuth()

  const mergeLists = (prev, incoming) => {
    const map = new Map()
    prev.forEach(l => map.set(l._id, l))
    incoming.forEach(l => map.set(l._id, l))
    return Array.from(map.values())
  }

  const fetchShoppingLists = async () => {
    try {
      const { data } = await axios.get('/api/ShoppingLists')
      setShoppingLists(prev => mergeLists(prev, data))
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await axios.get('/api/ShoppingLists')
        if (active) setShoppingLists(prev => mergeLists(prev, data))
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const h = l => {
      if (l.members.some(m => m._id === user.id || m._id === user._id))
        setShoppingLists(prev => mergeLists(prev, [l]))
    }
    on('listCreated', h)
    return () => off('listCreated', h)
  }, [on, off, user])

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) fetchShoppingLists()
      const rId = route.params?.refreshList
      const ts = route.params?.timestamp
      if (rId || ts) {
        fetchShoppingLists()
        navigation.setParams({ refreshList: undefined, timestamp: undefined })
      }
    }, [route.params?.refreshList, route.params?.timestamp, navigation, loading])
  )

  const addList = () => setModalVisible(true)
  const close = () => setModalVisible(false)

  const createNewList = async (title, ids, imp) => {
    try {
      const { data } = await axios.post('/api/ShoppingLists', { title, members: ids, importantList: imp })
      setShoppingLists(prev => mergeLists(prev, [data]))
      close()
    } catch {}
  }

  const renderItem = ({ item }) => <ShoppingListScreenItem listObj={item} navigation={navigation} />

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <AddListModal isVisible={isModalVisible} onClose={close} createList={createNewList} />
      <View style={{ flex: 1 }}>
        <PriceSyncBanner />
        <FlatList
          data={shoppingLists}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator
          style={{ flex: 1 }}
        />
      </View>
      <TouchableHighlight
        onPress={addList}
        style={[{ position: 'absolute', right: 20, padding: 16, borderWidth: 2, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 12 }, { bottom: insets.bottom + 80, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
        underlayColor={theme.colors.surface}
      >
        <MaterialCommunityIcons name="plus" color={theme.colors.onPrimary} size={28} />
      </TouchableHighlight>
    </SafeAreaView>
  )
}
