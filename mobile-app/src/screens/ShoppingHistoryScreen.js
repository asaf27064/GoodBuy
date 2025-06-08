import React,{useState, useEffect} from 'react';
import axios from 'axios';
import { View, Text, Button, SafeAreaView, FlatList } from 'react-native';
import globalStyles from '../styles/globalStyles';

function ShoppingHistoryScreen({navigation}) {

    const currentUserId = '681124a37782b0cfc87cec16'; // "Me"'s user Id. Should be the current user's Id.

    const renderItem = ({item}) => {
        return (
            <View style={{backgroundColor: 'white', padding: 20, flex: 1}}>
                <Text>{item.listId}</Text>
            </View>
        );
    };

    const [userPurchases, setUserPurchases] = useState();

    useEffect(() => {

        const fetchUserPurchases = async function(userId) {
            try {
                const response = await axios.get('http://192.168.0.105:3000/api/Purchases/' + userId);
                setUserPurchases(response.data);

              } catch (err) {
                console.error('Error finding purchase history:', err);
              }
        }
      
        fetchUserPurchases(currentUserId);
      }, []);
    console.log(userPurchases);

    return (
        <SafeAreaView style={globalStyles.container}>
            <Text>History</Text>
            <FlatList data={userPurchases} renderItem={renderItem} style={{flex:1}}/>
            </SafeAreaView>
    );
}

export default ShoppingHistoryScreen;