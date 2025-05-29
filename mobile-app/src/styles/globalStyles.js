import { StyleSheet } from 'react-native'

export default theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    shopList: {
      marginTop: 10,
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.roundness,
    },
    addListBtn: {
      backgroundColor: theme.colors.primary,
      position: 'absolute',
      right: 20,
      padding: 20,
      borderRadius: theme.roundness,
      zIndex: 10,
      elevation: 10,
    },
    headerText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
    },
    text: {
      color: theme.colors.onBackground,
    },
  })
