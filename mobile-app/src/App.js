import React, { useState, useEffect } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import axios from 'axios'
import io from 'socket.io-client'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer'
import HomeScreen from './screens/HomeScreen'
import { ShoppingListStack } from './screens/ShoppingListsScreen'
import ShoppingHistoryScreen from './screens/ShoppingHistoryScreen'
import RecommendationScreen from './screens/RecommendationsScreen'
import PriceComparisonScreen from './screens/PriceComparisonScreen'
import { COLORS } from './styles/colors'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import { API_BASE } from './config'

MaterialCommunityIcons.loadFont()


axios.defaults.baseURL = API_BASE
const socket = io(API_BASE)

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const Drawer = createDrawerNavigator()

function CustomDrawerContent(props) {
  const { logout } = useAuth()
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem
        label="Logout"
        onPress={() => {
          logout()
          props.navigation.closeDrawer()
        }}
      />
    </DrawerContentScrollView>
  )
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: COLORS.goodBuyGreen,
        tabBarInactiveTintColor: COLORS.white,
        tabBarStyle: { backgroundColor: COLORS.goodBuyGray },
        headerStyle: { backgroundColor: COLORS.goodBuyGreen },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginRight: 16 }}>
            <MaterialCommunityIcons name="menu" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )
      })}
    >
      <Tab.Screen
        name="ShopList"
        component={ShoppingListStack}
        options={{
          tabBarLabel: 'Shopping Lists',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="script-text" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Recommend"
        component={RecommendationScreen}
        options={{
          tabBarLabel: 'Suggestions',
          title: 'Personalized Suggestions',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="thumb-up" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Compare"
        component={PriceComparisonScreen}
        options={{
          tabBarLabel: 'Comparison',
          title: 'Price Comparison',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="scale-unbalanced" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="History"
        component={ShoppingHistoryScreen}
        options={{
          tabBarLabel: 'History',
          title: 'Purchase History',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-clock" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  )
}

function MainApp() {
  const [items, setItems] = useState([])

  useEffect(() => {
    socket.on('itemAdded', i => setItems(p => [...p, i]))
    return () => socket.off('itemAdded')
  }, [])

  return (
    <Drawer.Navigator
      drawerPosition="right"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="Home" component={Tabs} />
    </Drawer.Navigator>
  )
}

function AuthRoutes() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}

function Root() {
  const { token, loading } = useAuth()
  if (loading) return null
  return token ? <MainApp /> : <AuthRoutes />
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({})
