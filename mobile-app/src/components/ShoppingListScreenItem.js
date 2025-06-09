// mobile-app/src/components/ShoppingListScreenItem.js

import React from 'react';
import { View, Text, TouchableHighlight, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import globalStyles from '../styles/globalStyles';

const ShoppingListScreenItem = ({ listObj, navigation }) => {
  const { title, members } = listObj;

  // Navigate passing listObj directly
  const goToEditList = () =>
    navigation.navigate('EditItems', { listObj });
  const goToCheckList = () =>
    navigation.navigate('CheckItems', { listObj });
  const goToEditHistory = () =>
    navigation.navigate('EditHistory', { listObj });
  const goToSuggestions = () =>
    navigation.navigate('Recommend', { listObj });
  const goToPriceComparison = () =>
    navigation.navigate('Compare', { listObj });

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={globalStyles.headerText}>{title}</Text>
        <Text>Members: {members.map(u => u.username).join(', ')}</Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableHighlight onPress={goToEditList} style={styles.btn}>
          <MaterialCommunityIcons name="file-edit-outline" size={24} />
        </TouchableHighlight>
        <TouchableHighlight onPress={goToSuggestions} style={styles.btn}>
          <MaterialCommunityIcons name="thumb-up-outline" size={24} />
        </TouchableHighlight>
        <TouchableHighlight onPress={goToPriceComparison} style={styles.btn}>
          <MaterialCommunityIcons name="scale-unbalanced" size={24} />
        </TouchableHighlight>
        <TouchableHighlight onPress={goToCheckList} style={styles.btn}>
          <MaterialCommunityIcons name="check-circle-outline" size={24} />
        </TouchableHighlight>
        <TouchableHighlight onPress={goToEditHistory} style={styles.btn}>
          <MaterialCommunityIcons name="history" size={24} />
        </TouchableHighlight>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    margin: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden'
  },
  textContainer: {
    padding: 12
  },
  buttonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ddd'
  },
  btn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default ShoppingListScreenItem;
