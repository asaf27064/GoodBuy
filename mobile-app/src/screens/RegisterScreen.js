import React,{useState} from 'react';
import {View,TextInput,Button,StyleSheet} from 'react-native';
import {useAuth} from '../contexts/AuthContext';

export default function RegisterScreen(){
  const{register}=useAuth();
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  return(
    <View style={s.c}>
      <TextInput style={s.i} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none"/>
      <TextInput style={s.i} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry/>
      <Button title="Sign Up" onPress={()=>register(email,password)}/>
    </View>
  );
}

const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},i:{borderWidth:1,borderColor:'#ccc',padding:12,marginBottom:12,borderRadius:4}});
