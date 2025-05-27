import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  const applyAuth = t => {
    if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`
    else delete axios.defaults.headers.common.Authorization
  }

  useEffect(() => {
    ;(async () => {
      const t = await SecureStore.getItemAsync('token')
      setToken(t)
      applyAuth(t)
      setLoading(false)
    })()
  }, [])

  const login = async (username, password) => {
    console.log('🚌 sending POST /auth/login')
    const { data } = await axios.post('/auth/login', { username, password })
    console.log('🚚 login 2xx')
    await SecureStore.setItemAsync('token', data.token)
    setToken(data.token)
    applyAuth(data.token)
  }

  const register = async (email, username, password) => {
    console.log('🚌 sending POST /auth/register')
    await axios.post('/auth/register', { email, username, password })
    console.log('🚚 register 2xx')
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync('token')
    setToken(null)
    applyAuth(null)
  }

  return (
    <AuthContext.Provider value={{ token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
