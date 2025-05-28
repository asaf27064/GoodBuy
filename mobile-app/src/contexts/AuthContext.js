import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  const applyAuth = useCallback(t => {
    if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`
    else delete axios.defaults.headers.common.Authorization
  }, [])

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('refreshToken')
    setToken(null)
    applyAuth(null)
  }, [applyAuth])

  useEffect(() => {
    ;(async () => {
      const t = await SecureStore.getItemAsync('token')
      setToken(t)
      applyAuth(t)
      setLoading(false)
    })()
  }, [applyAuth])

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          const rt = await SecureStore.getItemAsync('refreshToken')
          if (rt) {
            try {
              const { data } = await axios.post('/auth/refresh', { refreshToken: rt })
              await SecureStore.setItemAsync('token', data.accessToken)
              setToken(data.accessToken)
              applyAuth(data.accessToken)
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
              return axios(originalRequest)
            } catch (err) {
              await logout()
            }
          } else {
            await logout()
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptorId)
  }, [applyAuth, logout])

  const login = async (username, password) => {
    const { data } = await axios.post('/auth/login', { username, password })
    await SecureStore.setItemAsync('token', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    setToken(data.accessToken)
    applyAuth(data.accessToken)
  }

  const register = async (email, username, password) => {
    await axios.post('/auth/register', { email, username, password })
  }

  return (
    <AuthContext.Provider value={{ token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)