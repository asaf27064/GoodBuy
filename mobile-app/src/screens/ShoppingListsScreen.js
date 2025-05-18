import React, {useState} from 'react';
import axios from 'axios';
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
        <Stack.Screen name="CheckItems" component={CheckListScreen} options={({ route }) => ({
        title: route.params.list.listObj.title, 
      })}/>
        <Stack.Screen name="EditItems" component={EditListScreen} options={({ route }) => ({
        title: route.params.list.listObj.title,
      })}/>
        <Stack.Screen name="EditHistory" component={EditHistoryScreen} options={({ route }) => ({
        title: route.params.list.listObj.title,
      })}/>
    </Stack.Navigator>
    );
 }

export default function ShoppingListScreen({navigation}) {

    const renderItem = ({item}) => {

        return (
            <View style={styles.shopList}>
                <ShoppingList listObj = {item}
                              listId={item._id}
                              members={item.members}
                              title={item.title}
                              products={item.products}
                              editLog = {item.editLog}
                              navigation={navigation}/>
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

    const [shoppingLists, setShoppingLists] = useState([]); // Empty for now, later need to fetch user's list (from local storage?)

    const createNewList = async function(listName, membersList, isImportant) {

        const data = {
          title: listName,
          members: [membersList], // This should be a list to begin with, change later
          importantList: isImportant
      }

      // Server is running on port 3000 currently, need to make that ip/port agnostic
      try {
        const response = await axios.post('http://192.168.0.105:3000/api/ShoppingLists',  data );
        setShoppingLists([...shoppingLists, response.data]);
        handleCloseModal();
      } catch (err) {
        console.error('Error creating todo:', err);
      }
    }

    return (
        <SafeAreaView style={globalStyles.container}>
            <AddListModal isVisible={isModalVisible} onClose={handleCloseModal} createList={createNewList}/>
            <FlatList data={shoppingLists} renderItem={renderItem}/>
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


