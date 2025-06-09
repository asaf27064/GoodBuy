import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import { API_BASE } from '../config'

axios.defaults.baseURL = API_BASE

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  // Apply or remove Authorization header for axios
  const applyAuth = useCallback(t => {
    if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`
    else delete axios.defaults.headers.common.Authorization
  }, [])

  // Logout: clear both tokens
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('refreshToken')
    setToken(null)
    applyAuth(null)
  }, [applyAuth])

  // On app start: load token, validate with /auth/me, or logout
  useEffect(() => {
    ;(async () => {
      const t = await SecureStore.getItemAsync('token')
      if (t) {
        applyAuth(t)
        try {
          await axios.get('/auth/me')    // validate token
          setToken(t)
        } catch {
          await logout()
        }
      }
      setLoading(false)
    })()
  }, [applyAuth, logout])

  //  on 401, try refresh then retry original request
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => res,
      async error => {
        const orig = error.config
        if (error.response?.status === 401 && !orig._retry) {
          orig._retry = true
          const rt = await SecureStore.getItemAsync('refreshToken')
          if (rt) {
            try {
              const { data } = await axios.post('/auth/refresh', { refreshToken: rt })
              // save new access token
              await SecureStore.setItemAsync('token', data.accessToken)
              applyAuth(data.accessToken)
              orig.headers.Authorization = `Bearer ${data.accessToken}`
              return axios(orig)
            } catch {
              await logout()
            }
          } else {
            await logout()
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [applyAuth, logout])

  // Login: store both tokens and apply auth header
  const login = async (username, password) => {
    const { data } = await axios.post('/auth/login', { username, password })
    await SecureStore.setItemAsync('token', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    setToken(data.accessToken)
    applyAuth(data.accessToken)
  }

  // Register: return server message so caller can show it
  const register = async (email, username, password) => {
    const { data } = await axios.post('/auth/register', {
      email,
      username,
      password
    })
    return data
  }

  return (
    <AuthContext.Provider
      value={{ token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
