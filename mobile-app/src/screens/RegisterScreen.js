import React, { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  TextInput,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { COLORS } from '../styles/colors' // נניח שהגדרת צבעים כמו goodBuyGreen, gray וכו'

export default function RegisterScreen() {
  const { register } = useAuth()
  const navigation = useNavigation()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // client-side validators (same as before)...
  const isEmailValid = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const isUsernameValid = u => /^[a-zA-Z0-9_]{3,20}$/.test(u)
  const isPasswordValid = p =>
    p.length >= 8 &&
    /[a-z]/.test(p) &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)

  const handleSignUp = async () => {
    // clear previous
    setErrors({})

    // client-side validation
    const clientErrors = {}
    if (!isEmailValid(email))      clientErrors.email = 'פורמט אימייל לא תקין'
    if (!isUsernameValid(username)) clientErrors.username = '3–20 תווים: אותיות, ספרות או קו תחתון בלבד'
    if (!isPasswordValid(password)) clientErrors.password = '8+ תווים, אות, אות גדולה, מספר, תו מיוחד'

    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      return
    }

    setLoading(true)
    try {
      const { message } = await register(email, username, password)
      Alert.alert('הצלחה', message, [{ text: 'אישור', onPress: () => navigation.goBack() }])
    } catch (e) {
      const data = e.response?.data
      if (data?.errors) {
        const map = {}
        data.errors.forEach(({ param, msg }) => (map[param] = msg))
        setErrors(map)
      } else {
        Alert.alert('שגיאה', data?.message || 'נסו שוב מאוחר יותר')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>הרשמה</Text>

          {/* Email */}
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          {/* Username */}
          <TextInput
            style={[styles.input, errors.username && styles.inputError]}
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          {errors.username && <Text style={styles.error}>{errors.username}</Text>}

          {/* Password */}
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {errors.password && <Text style={styles.error}>{errors.password}</Text>}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (loading || !email || !username || !password) && styles.buttonDisabled
            ]}
            onPress={handleSignUp}
            disabled={loading || !email || !username || !password}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>הרשמה</Text>
            }
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={styles.linkText}>יש לך חשבון? התחבר</Text>
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
  error: { color: 'red', marginBottom: 8, fontSize: 14 },
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
