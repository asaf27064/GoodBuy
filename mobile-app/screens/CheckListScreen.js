import React, {useState} from 'react';
import { View, FlatList, Text, SafeAreaView, Touchable, TouchableHighlight, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductCheckListItem from '../components/CheckListScreenItem';
import { COLORS } from '../styles/colors';

function CheckListScreen({route}) {

    /*const {name} = route.params;
    return (
        <View style={globalStyles.container}>
            <Text>Name of the list is: {JSON.stringify(name)}</Text>
        </View>
        
    );*/

    const renderItem = ({item}) => {
        return (
            <View style={styles.shopList}>
                <ProductCheckListItem product={item}/>
            </View>
        );
     }
     
    return (
        <SafeAreaView style={globalStyles.container}>
            <Text style={{color: 'white'}}> Check List Screen</Text>
            <FlatList data={route.params.list.products} renderItem={renderItem}/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    shopList: {
        flex: 1,
        borderRadius: 10,
        marginTop: 10,
        padding: 5,
        backgroundColor: 'pink'
    }, 

})

export default CheckListScreen;