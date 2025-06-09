// components/ShoppingListScreenItem.js
import React from 'react'
import { View, Text, TouchableHighlight, StyleSheet } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import globalStyles from '../styles/globalStyles'

export default function ShoppingListScreenItem({ listObj, navigation }) {
  const go = screen => () =>
    navigation.navigate(screen, { listObj })

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={globalStyles.headerText}>{listObj.title}</Text>
        <Text>
          members:{' '}
          {listObj.members.map(u => u.username).join(', ')}
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableHighlight onPress={go('EditItems')} style={styles.btn}>
          <MaterialCommunityIcons name="file-edit-outline" size={30} />
        </TouchableHighlight>
        <View style={styles.separator} />
        <TouchableHighlight onPress={go('Recommend')} style={styles.btn}>
          <MaterialCommunityIcons name="thumb-up-outline" size={30} />
        </TouchableHighlight>
        <View style={styles.separator} />
        <TouchableHighlight onPress={go('Compare')} style={styles.btn}>
          <MaterialCommunityIcons name="scale-unbalanced" size={30} />
        </TouchableHighlight>
        <View style={styles.separator} />
        <TouchableHighlight onPress={go('CheckItems')} style={styles.btn}>
          <MaterialCommunityIcons name="check-circle-outline" size={30} />
        </TouchableHighlight>
        <View style={styles.separator} />
        <TouchableHighlight onPress={go('EditHistory')} style={styles.btn}>
          <MaterialCommunityIcons name="history" size={30} />
        </TouchableHighlight>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'beige'
  },
  textContainer: {
    flex: 1,
    margin: 10
  },
  buttonsContainer: {
    flexDirection: 'row',
    backgroundColor: 'red',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  separator: {
    width: 1,
    backgroundColor: 'black'
  }
})
