// mobile-app/src/screens/AddItemScreen.js

import React, { useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { Searchbar, List, useTheme } from 'react-native-paper';
import debounce from 'lodash/debounce';
import axios from 'axios';
import { API_BASE } from '../config';

axios.defaults.baseURL = API_BASE;

export default function AddItemScreen({ navigation }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Debounced server search
  const doSearch = useCallback(
    debounce(async term => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      try {
        const { data } = await axios.get(`/api/Products/search/${term}`);
        setResults(data.results);
      } catch (e) {
        console.error('Search error:', e);
      }
    }, 300),
    []
  );

  const onChange = text => {
    setQuery(text);
    doSearch(text);
  };

  const renderItem = ({ item, index }) => (
    <List.Item
      key={`${item.itemName}_${index}`}
      title={item.itemName}
      left={props => <List.Icon {...props} icon="cube-outline" />}
      onPress={() => {
        // Merge selected item back into EditItems
        navigation.navigate({
          name: 'EditItems',
          params: { addedItem: item },
          merge: true
        });
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Searchbar
        placeholder="Search for item"
        onChangeText={onChange}
        value={query}
        style={{ margin: 8, elevation: 2 }}
      />
      <FlatList
        data={results}
        keyExtractor={(item, i) => `${item.itemName}_${i}`}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
