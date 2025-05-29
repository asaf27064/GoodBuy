import React, { useState, useCallback } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { Text, TextInput, HelperText, Button } from 'react-native-paper'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS } from '../styles/colors'

export default function LoginScreen() {
  const { login } = useAuth()
  const navigation = useNavigation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear inputs & errors when screen focused
  useFocusEffect(
    useCallback(() => {
      setUsername('')
      setPassword('')
      setError('')
    }, [])
  )

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      // on success, navigation handled by AuthContext/Root
    } catch (e) {
      const msg = e.response?.data?.message || 'אירעה שגיאה, נסה שוב מאוחר יותר'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>התחברות</Text>

          <TextInput
            label="Username"
            mode="outlined"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            error={!!error}
            style={styles.input}
          />

          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={!!error}
            style={styles.input}
          />

          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !username || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            buttonColor={COLORS.goodBuyGreen}
            rippleColor="rgba(255,255,255,0.3)"
          >
            התחבר
          </Button>

          <Button
            onPress={() => navigation.navigate('Register')}
            uppercase={false}
            style={styles.link}
            labelStyle={styles.linkLabel}
          >
            אין לך חשבון? הרשמה
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.goodBuyGrayLight },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.goodBuyGreen,
    textAlign: 'center',
    marginBottom: 20
  },
  input: { marginBottom: 8 },
  button: { marginTop: 16, borderRadius: 8 },
  buttonContent: { paddingVertical: 8 },
  buttonLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  link: { marginTop: 8 },
  linkLabel: { color: COLORS.goodBuyGreen }
})
