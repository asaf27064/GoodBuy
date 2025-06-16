import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  View,
  FlatList,
  SafeAreaView,
  TouchableHighlight,
  ActivityIndicator
} from 'react-native'
import { useTheme } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import makeGlobalStyles from '../styles/globalStyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

// Components & Screens
import ShoppingListScreenItem from '../components/ShoppingListScreenItem'
import AddListModal from '../components/AddListModal'
import PriceSyncBanner from '../components/PriceSyncBanner'

// Navigation
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import CheckListScreen from './CheckListScreen'
import EditListScreen from './EditListScreen'
import EditHistoryScreen from './EditHistoryScreen'
import RecommendationScreen from './RecommendationsScreen'
import PriceComparisonScreen from './PriceComparisonScreen'
import AddItemScreen from './AddItemScreen'

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
      <Stack.Screen
        name="My Shopping Lists"
        component={ShoppingListScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="CheckItems"
        component={CheckListScreen}
        options={({ route }) => ({
          title: `${route.params.listObj.title}: Check Items`
        })}
      />
      <Stack.Screen
        name="EditItems"
        component={EditListScreen}
        options={({ route }) => ({
          title: `${route.params.listObj.title}: Edit List`
        })}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: 'Add Item' }}
      />
      <Stack.Screen
        name="EditHistory"
        component={EditHistoryScreen}
        options={({ route }) => ({
          title: `${route.params.listObj.title}: Edit History`
        })}
      />
      <Stack.Screen
        name="Recommend"
        component={RecommendationScreen}
        options={({ route }) => ({
          title: `${route.params.listObj.title}: Suggestions`
        })}
      />
      <Stack.Screen
        name="Compare"
        component={PriceComparisonScreen}
        options={({ route }) => ({
          title: `${route.params.listObj.title}: Price Comparison`
        })}
      />
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

  // Function to fetch shopping lists
  const fetchShoppingLists = async () => {
    try {
      const { data } = await axios.get('/api/ShoppingLists')
      setShoppingLists(data)
    } catch (err) {
      console.error('Error fetching lists:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    let isActive = true
    ;(async () => {
      try {
        const { data } = await axios.get('/api/ShoppingLists')
        if (isActive) setShoppingLists(data)
      } catch (err) {
        console.error('Error fetching lists:', err)
      } finally {
        if (isActive) setLoading(false)
      }
    })()
    return () => {
      isActive = false
    }
  }, [])

  // Handle refresh when coming back from EditListScreen
  useFocusEffect(
    React.useCallback(() => {
      // Check if we need to refresh a specific list or all lists
      const refreshListId = route.params?.refreshList
      const timestamp = route.params?.timestamp
      
      if (refreshListId || timestamp) {
        // Refresh the data when we return from edit screen
        fetchShoppingLists()
        
        // Clear the refresh params
        navigation.setParams({ 
          refreshList: undefined, 
          timestamp: undefined 
        })
      }
    }, [route.params?.refreshList, route.params?.timestamp, navigation])
  )

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
    <ShoppingListScreenItem listObj={item} navigation={navigation} />
  )

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <AddListModal
        isVisible={isModalVisible}
        onClose={handleCloseModal}
        createList={createNewList}
      />

      <View style={{ flex: 1 }}>
        {/* Price Sync Banner at the top */}
        <PriceSyncBanner />

        <FlatList
          data={shoppingLists}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ 
            paddingVertical: 8,
            // Add extra padding at bottom to account for floating tab bar and add button
            paddingBottom: insets.bottom + 120
          }}
          // Ensure scrolling works properly with the banner
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
        />
      </View>

      <TouchableHighlight
        onPress={addList}
        style={[
          localStyles.addListBtn,
          {
            bottom: insets.bottom + 80,
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

const localStyles = {
  addListBtn: {
    position: 'absolute',
    right: 20,
    padding: 16,
    borderWidth: 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 12
  }
}