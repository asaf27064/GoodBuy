import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen'
import { ShoppingListStack } from './screens/ShoppingListsScreen'
import ShoppingHistoryScreen from './screens/ShoppingHistoryScreen'
import RecommendationScreen from './screens/RecommendationsScreen'
import PriceComparisonScreen from './screens/PriceComparisonScreen'
import { COLORS }  from './styles/colors';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"

// Replace YOUR_SERVER_IP with your local machine's IP if testing on a device
const socket = io('http://192.168.0.105:3000');

export default function App() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Fetch items from backend
    axios.get('http://192.168.0.105:3000/ping')
      .then(response => console.log('Backend response:', response.data))
      .catch(err => console.error(err));

    // Listen for socket events
    socket.on('itemAdded', item => {
      setItems(prevItems => [...prevItems, item]);
    });

    return () => socket.off('itemAdded');
  }, []);


  const Tab = createBottomTabNavigator(); // Used for Navigation between main screen
  
  return (
    /*            <Tab.Screen name="Home" component={HomeScreen} options={{
              tabBarLabel: 'Home',
              tabBarIcon:({focused,color,size}) => (
              <MaterialCommunityIcons name="home" color={color} size={size}/>)
              }}/> */
      <NavigationContainer>
        <Tab.Navigator screenOptions={{
            tabBarActiveTintColor: COLORS.goodBuyGreen,
            tabBarInactiveTintColor: COLORS.white,
            tabBarStyle: {backgroundColor: COLORS.goodBuyGray},
              headerStyle: {
                backgroundColor: COLORS.goodBuyGreen,
              },
              headerTintColor: COLORS.white,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}>
            <Tab.Screen name="ShopList" component={ShoppingListStack} options={{
              tabBarLabel: 'Shopping Lists', 
              headerShown: false,
              tabBarIcon:({focused,color,size}) => (
                <MaterialCommunityIcons name="script-text" color={color} size={size}/>)
                }}/>
            <Tab.Screen name="Recommend" component={RecommendationScreen} options={{
              title: "Personalized Suggestions",
              tabBarLabel: 'Suggestions',
              tabBarIcon:({focused,color,size}) => (
                <MaterialCommunityIcons name="thumb-up" color={color} size={size}/>)
                }}/>
            <Tab.Screen name="Compare" component={PriceComparisonScreen} options={{
              title: "Price Comparison",
              tabBarLabel: 'Comparison',
              tabBarIcon:({focused,color,size}) => (
                <MaterialCommunityIcons name="scale-unbalanced" color={color} size={size}/>)
                }}/>
            <Tab.Screen name="History" component={ShoppingHistoryScreen} options={{
              title: "Pruchase History",
              tabBarLabel: 'History',
              tabBarIcon:({focused,color,size}) => (
                <MaterialCommunityIcons name="clipboard-text-clock" color={color} size={size}/>)
                }}/>
          </Tab.Navigator>
      </NavigationContainer>
    /*<View style={styles.container}>
      <Text style={styles.header}>GoodBuy Shopping List</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.name}</Text>
        )}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter item name"
        value={text}
        onChangeText={setText}
      />
      <Button title="Add Item" onPress={() => { /* Call your API to add item }} />
    </View>*/
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50
  },
  header: {
    fontSize: 24,
    marginBottom: 10
  },
  item: {
    fontSize: 18,
    marginVertical: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10
  }, 
  
});
