import React,{useState} from 'react';
import {View,TextInput,Button,StyleSheet} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';


export default function LoginScreen(){
  const{login}=useAuth();
  const navigation = useNavigation();
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  return(
    <View style={s.c}>
      <TextInput style={s.i} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none"/>
      <TextInput style={s.i} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry/>
      <Button title="Log In" onPress={()=>login(email,password)}/>
      <Button title="Sign Up" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}

const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},i:{borderWidth:1,borderColor:'#ccc',padding:12,marginBottom:12,borderRadius:4}});
