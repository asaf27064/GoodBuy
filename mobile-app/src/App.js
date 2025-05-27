import React, { useState, useEffect } from 'react'
import { Button, StyleSheet } from 'react-native'
import axios from 'axios'
import io from 'socket.io-client'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
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

const socket = io(API_BASE)

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const MainApp = () => {
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const { logout } = useAuth()

  useEffect(() => {
    axios.get('/ping').then(r => console.log('Backend response:', r.data)).catch(console.error)
    socket.on('itemAdded', i => setItems(p => [...p, i]))
    return () => socket.off('itemAdded')
  }, [])

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.goodBuyGreen,
          tabBarInactiveTintColor: COLORS.white,
          tabBarStyle: { backgroundColor: COLORS.goodBuyGray },
          headerStyle: { backgroundColor: COLORS.goodBuyGreen },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <Button onPress={logout} title="Logout" color="#fff" />
          )
        }}
      >
        <Tab.Screen
          name="ShopList"
          component={ShoppingListStack}
          options={{
            tabBarLabel: 'Shopping Lists',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="script-text" color={color} size={size} />
            )
          }}
        />
        <Tab.Screen
          name="Recommend"
          component={RecommendationScreen}
          options={{
            title: 'Personalized Suggestions',
            tabBarLabel: 'Suggestions',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="thumb-up" color={color} size={size} />
            )
          }}
        />
        <Tab.Screen
          name="Compare"
          component={PriceComparisonScreen}
          options={{
            title: 'Price Comparison',
            tabBarLabel: 'Comparison',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="scale-unbalanced" color={color} size={size} />
            )
          }}
        />
        <Tab.Screen
          name="History"
          component={ShoppingHistoryScreen}
          options={{
            title: 'Purchase History',
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-text-clock" color={color} size={size} />
            )
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

const AuthRoutes = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  </NavigationContainer>
)

const Root = () => {
  const { token, loading } = useAuth()
  if (loading) return null
  return token ? <MainApp /> : <AuthRoutes />
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 50 },
  header: { fontSize: 24, marginBottom: 10 },
  item: { fontSize: 18, marginVertical: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 }
})
