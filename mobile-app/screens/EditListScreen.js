import React, {useState} from 'react';
import { View, FlatList, Text, SafeAreaView, TouchableHighlight, TextInput, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductListItem from '../components/EditListScreenItem';
import { COLORS } from '../styles/colors';

function EditListScreen({route}) {

    /*const {name} = route.params;
    return (
        <View style={globalStyles.container}>
            <Text>Name of the list is: {JSON.stringify(name)}</Text>
        </View>
        
    );*/

    const renderItem = ({item}) => {
        return (
        <ProductListItem product = {item}/>
        );
    }

    const myProdcuts = [{name: "Bamba 200gr", picture: "https://pinookim.co.il/wp-content/uploads/2024/05/6926822_7290104508943_L_Enlarge_800x800.webp", price: 11.90 , numUnits: 1},
    {name: "Bisli 200grrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol', price: 13.90, numUnits: 2},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1},
    {name: "Bisli 200gr", picture: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", price: 13.90, numUnits: 1}]
    
    const {name} = route.params;
    return (
        <SafeAreaView style={globalStyles.container}>
            <Text>Name of the list is: {JSON.stringify(name)}</Text>
            <View style={styles.totalPrice}>
                <TouchableHighlight>
                <TextInput placeholder="Search Item"></TextInput>
                </TouchableHighlight>
            </View>
            <FlatList data={myProdcuts} style = {styles.prodList}
            renderItem={renderItem}
            />
            <View style={styles.totalPrice}>
                <TouchableHighlight>
                    <Text>Save Changes</Text>
                </TouchableHighlight>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    totalPrice: {
        backgroundColor: 'red',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        margin: 10
    }, 
    prodList: {
        margin: 10,
        /*borderRadius:20,
        borderWidth: 2,
        borderStyle: 'dashed',*/
        borderColor: COLORS.white
    }
})

export default EditListScreen;