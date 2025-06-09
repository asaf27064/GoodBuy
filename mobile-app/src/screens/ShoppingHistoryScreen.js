import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { View, Text, Button, SafeAreaView, FlatList } from 'react-native';
import globalStyles from '../styles/globalStyles';
import { API_BASE } from '../config';

// Set the base URL for all axios requests
axios.defaults.baseURL = API_BASE;

function ShoppingHistoryScreen({ navigation }) {
  const currentUserId = '681124a37782b0cfc87cec16'; // "Me"'s user Id. Should be the current user's Id.

  const [userPurchases, setUserPurchases] = useState();

  useEffect(() => {
    const fetchUserPurchases = async function(userId) {
      try {
        const response = await axios.get(`/api/Purchases/${userId}`);
        setUserPurchases(response.data);
      } catch (err) {
        console.error('Error finding purchase history:', err);
      }
    };

    fetchUserPurchases(currentUserId);
  }, []);

  console.log(userPurchases);

  const renderItem = ({ item }) => {
    return (
      <View style={{ backgroundColor: 'white', padding: 20, flex: 1 }}>
        <Text>{item.listId}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <Text>History</Text>
      <FlatList
        data={userPurchases}
        renderItem={renderItem}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

export default ShoppingHistoryScreen;
