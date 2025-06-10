// mobile-app/src/components/ShoppingListScreenItem.js

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Title, Paragraph, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export default function ShoppingListScreenItem({ listObj, navigation }) {
  const theme = useTheme()
  const { title, members, _id } = listObj

  const goToEditList = () =>
    navigation.navigate('EditItems', { listObj })
  const goToCheckList = () =>
    navigation.navigate('CheckItems', { listObj })
  const goToEditHistory = () =>
    navigation.navigate('EditHistory', { listObj })
  const goToSuggestions = () =>
    navigation.navigate('Recommend', { listObj })
  const goToPriceComparison = () =>
    navigation.navigate('Compare', { listObj })

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Title style={{ color: theme.colors.onSurface }}>{title}</Title>
        <Paragraph style={{ color: theme.colors.onSurfaceDisabled }}>
          Members: {members.map(u => u.username).join(', ')}
        </Paragraph>
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <ActionButton icon="playlist-edit" onPress={goToEditList} />
        <ActionButton icon="lightbulb-on-outline" onPress={goToSuggestions} />
        <ActionButton icon="scale-balance" onPress={goToPriceComparison} />
        <ActionButton icon="checkbox-marked-circle-outline" onPress={goToCheckList} />
        <ActionButton icon="history" onPress={goToEditHistory} />
      </Card.Actions>
    </Card>
  )
}

// A small reusable button inside the Card.Actions
function ActionButton({ icon, onPress }) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={theme.colors.primary}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 3
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  btn: {
    padding: 8
  }
})
