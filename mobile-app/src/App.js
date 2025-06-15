import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MotiView } from 'moti';
import { PriceSyncProvider } from './contexts/PriceSyncContext';


// React Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem
} from '@react-navigation/drawer';

// Screens & stacks
import { ShoppingListStack } from './screens/ShoppingListsScreen';
import ShoppingHistoryScreen from './screens/ShoppingHistoryScreen';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// Theme
import { Provider as PaperProvider, useTheme } from 'react-native-paper';
import paperTheme from './theme/paperTheme';

// Config
import { API_BASE } from './config';

MaterialCommunityIcons.loadFont();
axios.defaults.baseURL = API_BASE;
io(API_BASE); // just open socket

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Animated tab icon
function AnimatedIcon({ name, color, size, focused }) {
  return (
    <MotiView
      animate={{ scale: focused ? 1.15 : 1 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <MaterialCommunityIcons name={name} color={color} size={size} />
    </MotiView>
  );
}

// Bottom tabs
function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ navigation, route }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <MaterialCommunityIcons
              name="menu"
              size={24}
              color={colors.onPrimary}
            />
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
          borderRadius: 20,
          height: 60,
          borderTopWidth: 0
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            ShopList: 'format-list-bulleted',
            History: 'history'
          };
          return (
            <AnimatedIcon
              name={icons[route.name]}
              color={color}
              size={size}
              focused={focused}
            />
          );
        }
      })}
    >
      <Tab.Screen
        name="ShopList"
        component={ShoppingListStack}
        options={{ title: 'Shopping Lists', headerShown: false }}
      />
      <Tab.Screen
        name="History"
        component={ShoppingHistoryScreen}
        options={{ title: 'Purchase History' }}
      />
    </Tab.Navigator>
  );
}

// Drawer with logout
function AppDrawer() {
  const { logout } = useAuth();
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerPosition="right"
      drawerContent={(props) => (
        <DrawerContentScrollView {...props}>
          <DrawerItem
            label="Logout"
            onPress={() => {
              logout();
              props.navigation.closeDrawer();
            }}
          />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="Home" component={MainTabs} />
    </Drawer.Navigator>
  );
}

// Auth flow
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Root
function RootNavigator() {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <AppDrawer /> : <AuthStack />;
}

export default function App() {
  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <PriceSyncProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </PriceSyncProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  menuButton: { marginRight: 16 }
});
