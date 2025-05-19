import React, {useState} from 'react';
import { View, FlatList, Text, SafeAreaView, Touchable, TouchableHighlight, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import EditHistoryItem from '../components/EditHistoryScreenItem';
import { COLORS } from '../styles/colors';

function EditHistoryScreen({route}) {

    /*const {name} = route.params;
    return (
        <View style={globalStyles.container}>
            <Text>Name of the list is: {JSON.stringify(name)}</Text>
        </View>
        
    );*/

    const renderItem = ({item}) => {
        return (
            <View style={styles.itemContainer}>
                <EditHistoryItem changedProd = {item.product} changedBy = {item.changedBy} action={item.action} timeStamp = {item.timeStamp} /*Add details/difference*//>
            </View>
        );
    }

    const currList = route.params.list.listObj;

    const [editHistory, setEditHistory] = useState(currList.editLog);
    console.log(editHistory);

    return (
        <SafeAreaView style={globalStyles.container} >
            <FlatList data={editHistory} renderItem={renderItem}/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        borderRadius: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'red'

    },
})

export default EditHistoryScreen;