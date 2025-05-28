// 📁 mobile-app/src/screens/RegisterScreen.js

import React, { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  Alert
} from 'react-native'
import {
  Text,
  TextInput,
  HelperText,
  Button
} from 'react-native-paper'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { COLORS } from '../styles/colors'

export default function RegisterScreen() {
  const { register } = useAuth()
  const navigation = useNavigation()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // client-side validators
  const isEmailValid = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const isUsernameValid = u => /^[a-zA-Z0-9_]{3,20}$/.test(u)
  const isPasswordValid = p =>
    p.length >= 8 &&
    /[a-z]/.test(p) &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)

  const handleSignUp = async () => {
    const clientErrors = {}
    if (!isEmailValid(email)) clientErrors.email = 'פורמט אימייל לא תקין'
    if (!isUsernameValid(username))
      clientErrors.username =
        'שם משתמש: 3–20 תווים, אותיות/ספרות/_ בלבד'
    if (!isPasswordValid(password))
      clientErrors.password =
        'סיסמה: מינימום 8 תווים, אות קטנה, גדולה, ספרה ותו מיוחד'
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      return
    }

    setLoading(true)
    try {
      const { message } = await register(email, username, password)
      Alert.alert('הצלחה', message, [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ])
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
          {/* custom styled title */}
          <Text style={styles.title}>הרשמה</Text>

          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
            style={styles.input}
          />
          <HelperText type={errors.email ? 'error' : 'info'}>
            {errors.email || 'דוגמה: user@example.com'}
          </HelperText>

          <TextInput
            label="Username"
            mode="outlined"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            error={!!errors.username}
            style={styles.input}
          />
          <HelperText type={errors.username ? 'error' : 'info'}>
            {errors.username || '3–20 תווים, אותיות/ספרות/_ בלבד'}
          </HelperText>

          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={!!errors.password}
            style={styles.input}
          />
          <HelperText type={errors.password ? 'error' : 'info'}>
            {errors.password ||
              '8+ תווים, אות קטנה, גדולה, ספרה ותו מיוחד'}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading || !email || !username || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            buttonColor={COLORS.goodBuyGreen}         // pressed & normal color
            rippleColor="rgba(255,255,255,0.3)"        // lighter ripple
          >
            הרשמה
          </Button>

          <Button
            onPress={() => navigation.goBack()}
            uppercase={false}
            style={styles.link}
            labelStyle={styles.linkLabel}
          >
            יש לך חשבון? התחבר
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
