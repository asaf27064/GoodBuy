import React, {useState} from 'react';
import { View, FlatList, Text, SafeAreaView, Touchable, TouchableHighlight, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductCheckListItem from '../components/CheckListScreenItem';
import { COLORS } from '../styles/colors';

function CheckListScreen({route}) {

    const renderItem = ({item}) => {

        let checked = checkedProducts.has(item.product._id) ? true : false;
        

        return (
                <ProductCheckListItem product={item} checkStatus={checked} handleCheck={handleCheck}/>
        );
     }


    const currList = route.params.list.listObj
    
     // fetch current Items on the list from the server.
    const [checkedProducts, setcheckedProducts] = useState(new Set());
    const uncheckedItems = currList.products.filter(prod => !checkedProducts.has(prod.product._id));
    const checkedItems = currList.products.filter(prod => checkedProducts.has(prod.product._id));

    //console.log(uncheckedItems);
    //console.log(checkedItems);

    const handleCheck = (item) => {
        let updatedChecked = new Set(checkedProducts);

        if (checkedProducts.has(item.product._id)){
            updatedChecked.delete(item.product._id);
        } else {
            updatedChecked.add(item.product._id);
        }

        setcheckedProducts(updatedChecked);
    }


    return (
        <SafeAreaView style={globalStyles.container}>
            <Text style={{color: 'white'}}> Products to buy:</Text>
            <FlatList data={[...uncheckedItems]} keyExtractor={(item) => item.product._id} renderItem={renderItem}/>
            {checkedItems.length > 0 && (<Text style={{color: 'white'}}> Products bought:</Text>)}
            <FlatList data={[...checkedItems]} keyExtractor={(item) => item.product._id} renderItem={renderItem}/>
            <TouchableHighlight style={{backgroundColor: 'cyan'}}>
                <Text> Finish Pruchase</Text>
            </TouchableHighlight>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({


})

export default CheckListScreen;