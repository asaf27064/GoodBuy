import React, {useState} from 'react';
import { View, FlatList, StyleSheet, TouchableHighlight, SafeAreaView, Text} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ShoppingList from '../components/ShoppingListScreenItem';
import EditListScreen from './EditListScreen';
import CheckListScreen from './CheckListScreen';
import EditHistoryScreen from './EditHistoryScreen';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AddListModal from '../components/AddListModal';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';

const Stack = createNativeStackNavigator(); // Used for Navigation between main screen

export const ShoppingListStack = () => {
    return (
    <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.goodBuyGreen,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
        <Stack.Screen name="MyShoppingLists" component={ShoppingListScreen} options={{title: "My Shopping Lists"}}/>
        <Stack.Screen name="CheckItems" component={CheckListScreen} options={{title: "Insert List Name here"}}/>
        <Stack.Screen name="EditItems" component={EditListScreen} options={{title: "Insert List Name here"}}/>
        <Stack.Screen name="EditHistory" component={EditHistoryScreen} options={{title: "Insert List Name here"}}/>
    </Stack.Navigator>
    );
 }

export default function ShoppingListScreen({navigation}) {
    const myLists = [{listName:'weekend', members:'me',price:'100'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},
     {listName:'next week', members:'me & you',price:'200'},]

     const renderItem = ({item}) => {
        return (
            <View style={styles.shopList}>
                <ShoppingList listId={item.listName} members={item.members} /* Pending "title" and "products" field */ navigation={navigation}/>
            </View>
        );
     }

     const [isModalVisible, setModalVisible] = useState(false);

     const addList = () => {
        setModalVisible(true);
     }

     const handleCloseModal = () => {
        setModalVisible(false);
     }

    return (
        <SafeAreaView style={globalStyles.container}>
            <AddListModal isVisible={isModalVisible} onClose={handleCloseModal}/>
            <FlatList data={myLists} renderItem={renderItem}/>
            <TouchableHighlight onPress={addList} style={styles.addListBtn}>
                <MaterialCommunityIcons name="plus" color={COLORS.white} size={28}/>
            </TouchableHighlight>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    shopList: {
        flex: 1,
        borderRadius: 10,
        marginTop: 10,
        backgroundColor: 'pink'
    }, 
    addListBtn: {
        backgroundColor: COLORS.goodBuyGreen,
        position: 'absolute',
        bottom: 0,
        right: 0,
        alignItems: 'center',
        marginBottom: 20,
        marginRight: 20,
        padding: 20,
        borderColor: COLORS.goodBuyGreen,
        borderWidth: 2,
        borderRadius: 20
    }
})


