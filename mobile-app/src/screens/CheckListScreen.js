import React, { useState } from 'react';
import axios from 'axios';
import {
  View,
  FlatList,
  Text,
  SafeAreaView,
  TouchableHighlight
} from 'react-native';
import { useTheme } from 'react-native-paper';
import makeGlobalStyles from '../styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCheckListItem from '../components/CheckListScreenItem';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ConfirmPurchaseModal from '../components/ConfirmPurchaseModal';
import { API_BASE } from '../config';

MaterialCommunityIcons.loadFont();

export default function CheckListScreen({ route }) {
  const theme = useTheme();
  const styles = makeGlobalStyles(theme);
  const insets = useSafeAreaInsets();

  const currList = route.params.list.listObj;
  const [checkedProducts, setCheckedProducts] = useState(new Set());
  const [isModalVisible, setModalVisible] = useState(false);

  const uncheckedItems = currList.products.filter(
    p => !checkedProducts.has(p.product._id)
  );
  const checkedItems = currList.products.filter(p =>
    checkedProducts.has(p.product._id)
  );

  const handleCheck = item => {
    const updatedChecked = new Set(checkedProducts);
    if (checkedProducts.has(item.product._id)) {
      updatedChecked.delete(item.product._id);
    } else {
      updatedChecked.add(item.product._id);
    }
    setCheckedProducts(updatedChecked);
  };

  const confirmFinishPurchase = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleFinishPurchase = async (purchasedItems) => {
    const data = {
      listId: currList._id,
      timestamp: Date.now(),
      purchasedProducts: purchasedItems
    };

    try {
      const response = await axios.post(`${API_BASE}/api/Purchases/`, data);
      console.log('Added list to your purchase history, emptied products and editlog');
      currList.products = [];
      currList.editLog = [];
    } catch (err) {
      console.error('Error adding purchase:', err);
    }

    handleCloseModal();
  };

  const renderItem = ({ item }) => (
    <ProductCheckListItem
      product={item}
      checkStatus={checkedProducts.has(item.product._id)}
      handleCheck={handleCheck}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ConfirmPurchaseModal
        isVisible={isModalVisible}
        onClose={handleCloseModal}
        purchasedItems={checkedItems}
        handlePurchase={handleFinishPurchase}
        allCheckedFlag={uncheckedItems.length === 0}
      />

      <Text style={styles.headerText}>Products to buy:</Text>
      <FlatList
        data={uncheckedItems}
        keyExtractor={i => i.product._id}
        renderItem={renderItem}
      />
      {checkedItems.length > 0 && (
        <>
          <Text style={styles.headerText}>Products bought:</Text>
          <FlatList
            data={checkedItems}
            keyExtractor={i => i.product._id}
            renderItem={renderItem}
          />
        </>
      )}
      <TouchableHighlight
        style={[
          styles.addListBtn,
          {
            bottom: insets.bottom + 60 + 10,
            backgroundColor: theme.colors.secondary
          }
        ]}
        onPress={confirmFinishPurchase}
      >
        <Text style={styles.text}>Finish Purchase</Text>
      </TouchableHighlight>
    </SafeAreaView>
  );
}
