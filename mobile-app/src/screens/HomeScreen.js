import React from 'react'
import { SafeAreaView, View, Text } from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'

export default function HomeScreen() {
  const theme = useTheme()
  const styles = makeGlobalStyles(theme)

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text style={styles.headerText}>Welcome Guy</Text>
      </View>
    </SafeAreaView>
  )
}
