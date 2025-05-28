import React, { useState, useCallback } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  TextInput,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
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

  // Clear error and input fields whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      setError('')
      setUsername('')
      setPassword('')
    }, [])
  )

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      // on success, navigation happens automatically
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

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (loading || !username || !password) && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={loading || !username || !password}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>התחבר</Text>
            }
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
          >
            <Text style={styles.linkText}>אין לך חשבון? הרשמה</Text>
          </Pressable>
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.goodBuyGreen,
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 16
  },
  inputError: { borderColor: 'red' },
  error: { color: 'red', marginBottom: 12, fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: COLORS.goodBuyGreen,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
    alignItems: 'center'
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { backgroundColor: '#a5d6a7' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: COLORS.goodBuyGreen, fontSize: 14 }
})
