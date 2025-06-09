// mobile-app/src/screens/EditListScreen.js
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import axios from 'axios';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  TouchableHighlight
} from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductListItem from '../components/EditListScreenItem';
import { API_BASE } from '../config';

axios.defaults.baseURL = API_BASE;

export default function EditListScreen({ route, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // grab the listObj passed from ShoppingListsScreenItem
  const { listObj } = route.params;

  const [products, setProducts] = useState(listObj.products || []);
  const initialRef = useRef([...products]);

  // add-item button in the header — now passes listObj explicitly
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="plus"
          color={theme.colors.onPrimary}
          onPress={() =>
            navigation.navigate('AddItem', { listObj })
          }
        />
      )
    });
  }, [navigation, theme.colors.onPrimary, listObj]);

  // pick up the addedItem when AddItemScreen navigates back
  useEffect(() => {
    if (route.params?.addedItem) {
      setProducts(ps => [
        ...ps,
        { product: route.params.addedItem, numUnits: 1 }
      ]);
      // clear it so it won't re-run
      navigation.setParams({ addedItem: undefined });
    }
  }, [route.params?.addedItem, navigation]);

  // diff logic unchanged...
  const diffLog = (oldList, newList) => {
    const me = 'Me';
    const edits = [];

    oldList.forEach(o => {
      const m = newList.find(n => n.product.itemName === o.product.itemName);
      if (!m) {
        edits.push({ product: o.product, action: 'removed', changedBy: me, timeStamp: new Date() });
      } else if (m.numUnits !== o.numUnits) {
        edits.push({
          product: o.product,
          action: 'updated',
          changedBy: me,
          difference: m.numUnits - o.numUnits,
          timeStamp: new Date()
        });
      }
    });

    newList.forEach(n => {
      if (!oldList.find(o => o.product.itemName === n.product.itemName)) {
        edits.push({ product: n.product, action: 'added', changedBy: me, timeStamp: new Date() });
      }
    });

    return edits;
  };

  const saveChanges = async () => {
    const edits = diffLog(initialRef.current, products);
    const updated = {
      ...listObj,
      products,
      editLog: [...(listObj.editLog || []), ...edits]
    };
    try {
      await axios.put(`/api/ShoppingLists/${listObj._id}`, {
        list: updated,
        changes: edits
      });
      initialRef.current = [...products];
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(_, i) => `prod_${i}`}
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            removeProduct={p => setProducts(ps => ps.filter(x => x !== p))}
          />
        )}
        contentContainerStyle={{ padding: 8 }}
      />

      <View
        style={{
          padding: 16,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderColor: theme.colors.outline,
          paddingBottom: insets.bottom + 16
        }}
      >
        <TouchableHighlight
          onPress={saveChanges}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.roundness,
            padding: 12,
            alignItems: 'center'
          }}
          underlayColor={theme.colors.primary}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
            Save Changes
          </Text>
        </TouchableHighlight>
      </View>
    </SafeAreaView>
  );
}
