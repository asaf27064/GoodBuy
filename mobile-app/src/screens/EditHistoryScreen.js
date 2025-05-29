import React, { useState } from 'react'
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet
} from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import EditHistoryItem from '../components/EditHistoryScreenItem'

export default function EditHistoryScreen({ route }) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const currList = route.params.list.listObj
  const [editHistory] = useState(currList.editLog)

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <EditHistoryItem
        changedProd={item.product}
        changedBy={item.changedBy}
        action={item.action}
        timeStamp={item.timeStamp}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={editHistory} renderItem={renderItem} />
    </SafeAreaView>
  )
}

function makeStyles(theme) {
  const globals = makeGlobalStyles(theme)
  return StyleSheet.create({
    container: {
      ...globals.container
    },
    itemContainer: {
      borderRadius: theme.roundness,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 12
    }
  })
}
