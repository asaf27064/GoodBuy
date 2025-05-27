import React,{createContext,useContext,useState,useEffect} from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const AuthContext=createContext(null);

export const AuthProvider=({children})=>{
  const[loading,setLoading]=useState(true);
  const[token,setToken]=useState(null);

  const applyAuth=t=>{
    if(t)axios.defaults.headers.common.Authorization=`Bearer ${t}`;
    else delete axios.defaults.headers.common.Authorization;
  };

  useEffect(()=>{
    (async()=>{
      const t=await SecureStore.getItemAsync('token');
      setToken(t);
      applyAuth(t);
      setLoading(false);
    })();
  },[]);

  const login=async(email,password)=>{
    const{data}=await axios.post('http://192.168.0.105:3000/auth/login',{email,password});
    await SecureStore.setItemAsync('token',data.token);
    setToken(data.token);
    applyAuth(data.token);
  };

  const register=async(email,password)=>{
    await axios.post('http://192.168.0.105:3000/auth/register',{email,password});
  };

  const logout=async()=>{
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    applyAuth(null);
  };

  return(
    <AuthContext.Provider value={{token,loading,login,register,logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth=()=>useContext(AuthContext);
