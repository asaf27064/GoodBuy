  import React,{useState} from 'react'
  import {View,TextInput,Button,StyleSheet,Alert} from 'react-native'
  import {useAuth} from '../contexts/AuthContext'
  import {useNavigation} from '@react-navigation/native'

  export default function RegisterScreen(){
    const{register}=useAuth()
    const nav=useNavigation()
    const[email,setEmail]=useState('')
    const[password,setPassword]=useState('')

    const handleSignUp=async()=>{
      try{
        await register(email,password)
        nav.goBack()
      }catch(e){
        Alert.alert('Sign-up failed',e.response?.data?.message||e.message)
      }
    }

    return(
      <View style={s.c}>
        <TextInput style={s.i} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none"/>
        <TextInput style={s.i} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry/>
        <Button title="Sign Up" onPress={handleSignUp}/>
      </View>
    )
  }

  const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},i:{borderWidth:1,borderColor:'#ccc',padding:12,marginBottom:12,borderRadius:4}})
