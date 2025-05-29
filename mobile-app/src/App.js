import React, { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import axios from 'axios'
import io from 'socket.io-client'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { MotiView } from 'moti'

// Navigation
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer'

// Screens
import { ShoppingListStack } from './screens/ShoppingListsScreen'
import RecommendationScreen from './screens/RecommendationsScreen'
import PriceComparisonScreen from './screens/PriceComparisonScreen'
import ShoppingHistoryScreen from './screens/ShoppingHistoryScreen'

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'

// UI Theme & Provider
import { Provider as PaperProvider, DefaultTheme, useTheme } from 'react-native-paper'
import paperTheme from './theme/paperTheme'

// Config & Styles
import { API_BASE } from './config'
import { COLORS } from './styles/colors'

MaterialCommunityIcons.loadFont()
axios.defaults.baseURL = API_BASE
const socket = io(API_BASE)

// Navigator instances
const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const Drawer = createDrawerNavigator()

// Animated icon component
function AnimatedIcon({ name, color, size, focused }) {
  return (
    <MotiView
      animate={{ scale: focused ? 1.15 : 1 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <MaterialCommunityIcons name={name} color={color} size={size} />
    </MotiView>
  )
}

// Bottom Tabs with floating curved bar
function MainTabs() {
  const { colors } = useTheme()
  const badgeCount = 0

  return (
    <Tab.Navigator
      initialRouteName="ShopList"
      screenOptions={({ navigation, route }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <MaterialCommunityIcons name="menu" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        ),
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceDisabled,
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          elevation: 5,
          backgroundColor: colors.surface,
          borderRadius: 24,
          height: 60,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            ShopList: 'script-text',
            Recommend: 'thumb-up',
            Compare: 'scale-unbalanced',
            History: 'clipboard-text-clock',
          }
          return (
            <AnimatedIcon
              name={icons[route.name]}
              color={color}
              size={size}
              focused={focused}
            />
          )
        },
        tabBarBadge: route.name === 'History' && badgeCount > 0 ? badgeCount : undefined,
      })}
    >
      <Tab.Screen
        name="ShopList"
        component={ShoppingListStack}
        options={{ title: 'Shopping Lists' }}
      />
      <Tab.Screen
        name="Recommend"
        component={RecommendationScreen}
        options={{ title: 'Suggestions' }}
      />
      <Tab.Screen
        name="Compare"
        component={PriceComparisonScreen}
        options={{ title: 'Comparison' }}
      />
      <Tab.Screen
        name="History"
        component={ShoppingHistoryScreen}
        options={{ title: 'History' }}
      />
    </Tab.Navigator>
  )
}

// Drawer with custom logout
function AppDrawer() {
  const { logout } = useAuth()
  return (
    <Drawer.Navigator
      drawerPosition="right"
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props}>
          <DrawerItem label="Logout" onPress={() => { logout(); props.navigation.closeDrawer() }} />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="Home" component={MainTabs} />
    </Drawer.Navigator>
  )
}

// Auth stack for login/register
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}

// Root decides which flow
function RootNavigator() {
  const { token, loading } = useAuth()
  if (loading) return null
  return token ? <AppDrawer /> : <AuthStack />
}

// Main App entry
export default function App() {
  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  )
}

const styles = StyleSheet.create({
  menuButton: { marginRight: 16 },
})
