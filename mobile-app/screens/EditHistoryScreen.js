import React, {useState} from 'react';
import { View, FlatList, Text, SafeAreaView, Touchable, TouchableHighlight, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductListItem from '../components/EditListScreenItem';
import { COLORS } from '../styles/colors';

function EditHistoryScreen({route}) {

    /*const {name} = route.params;
    return (
        <View style={globalStyles.container}>
            <Text>Name of the list is: {JSON.stringify(name)}</Text>
        </View>
        
    );*/

    return (
        <Text> Edit History Screen</Text>
    );
}

const styles = StyleSheet.create({

})

export default EditHistoryScreen;