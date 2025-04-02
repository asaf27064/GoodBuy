import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';

// Replace YOUR_SERVER_IP with your local machine's IP if testing on a device
const socket = io('http://YOUR_SERVER_IP:3000');

export default function App() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Fetch items from backend
    axios.get('http://YOUR_SERVER_IP:3000/ping')
      .then(response => console.log('Backend response:', response.data))
      .catch(err => console.error(err));

    // Listen for socket events
    socket.on('itemAdded', item => {
      setItems(prevItems => [...prevItems, item]);
    });

    return () => socket.off('itemAdded');
  }, []);

  return (
    <View style={styles.container}>
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
      <Button title="Add Item" onPress={() => { /* Call your API to add item */ }} />
    </View>
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
  }
});
