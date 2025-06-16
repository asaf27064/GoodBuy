import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { API_BASE } from '../config'
import { useAuth } from './AuthContext'

const ListSocketContext = createContext(null)

export const ListSocketProvider = ({ children }) => {
  const { token } = useAuth()
  const socketRef = useRef(null)
  const pending = useRef([])
  const [connected, setConnected] = useState(false)
  const [editingUsers, setEditingUsers] = useState({})

  useEffect(() => {
    if (!token) return
    socketRef.current = io(API_BASE, { auth: { token } })

    socketRef.current.on('connect', () => {
      setConnected(true)
      pending.current.forEach(([ev, cb]) => socketRef.current.on(ev, cb))
      pending.current = []
    })

    socketRef.current.on('disconnect', () => setConnected(false))

    socketRef.current.on('editingUsers', ({ user, type }) => {
      setEditingUsers(prev => {
        const id = user.listId
        const set = new Set(prev[id] || [])
        if (type === 'add') set.add(user.username)
        if (type === 'remove') set.delete(user.username)
        return { ...prev, [id]: [...set] }
      })
    })

    return () => socketRef.current.disconnect()
  }, [token])

  const on = (ev, cb) => {
    if (connected) socketRef.current.on(ev, cb)
    else pending.current.push([ev, cb])
  }

  const off = (ev, cb) => {
    if (connected) socketRef.current.off(ev, cb)
    pending.current = pending.current.filter(p => p[0] !== ev || p[1] !== cb)
  }

  const emit = (ev, data) => socketRef.current?.emit(ev, data)

  const joinList  = id => emit('joinList',  { listId: id })
  const leaveList = id => emit('leaveList', { listId: id })
  const startEdit = (id, user) => emit('editingStart', { listId: id, user })
  const stopEdit  = (id, user) => emit('editingStop',  { listId: id, user })

  return (
    <ListSocketContext.Provider value={{ on, off, joinList, leaveList, startEdit, stopEdit, editingUsers }}>
      {children}
    </ListSocketContext.Provider>
  )
}

export const useListSocket = () => useContext(ListSocketContext)
