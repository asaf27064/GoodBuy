// List of Shopping List Items
// Calculate final price at bottom by adding total price for each shoppingListItem.

import { View, Text, TouchableHighlight, StyleSheet} from 'react-native';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import globalStyles from '../styles/globalStyles';

const ShoppingListScreenItem = ({listObj, listId, members, title, products, editLog, navigation}) => {

    // Currently the only data structurally based on the schemas, used in CheckItems only for now.
    // "numUnits" field should be determined by the actual value given in EditList.

    /*const myProdcuts = [{_id: "1", name: "Bamba 200gr", image: "https://pinookim.co.il/wp-content/uploads/2024/05/6926822_7290104508943_L_Enlarge_800x800.webp", category: "snack", numUnits: 5},
                        {_id: "2", name: "Bisli 200gr", image: "https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", category: "snack", numUnits: 3}
                    ]*/
    
    //const myList = {_id: "ObjID", members: ["UserId1", "UserId2"], title: "Yom Ha'Atzmaut 2025", importantList: false, products: myProdcuts}

    // GUY: There's probably a way to merge these three into one function, but I couldn't get it to work.

    console.log(listObj);

    const goToCheckList = () => {
        //console.log({listId})
        navigation.navigate('CheckItems', {list: {listObj}})
    }

    const goToEditList = () => {
        //console.log({listId})
        navigation.navigate('EditItems', {list: {listObj}})
    }

    const goToEditHistory = () => {
        //console.log({listId})
        navigation.navigate('EditHistory', {list: {listObj}})
    }


    return (
        <View style={styles.container}>
            <View style={{flex: 3}}>
                <Text style={globalStyles.headerText}>{title}</Text>
                <Text>members: {members.map((user) => user.username + ', ') /* remove ',' from last member*/} </Text>
            </View>
            <TouchableHighlight onPress={goToCheckList} style={styles.btn}>
                <MaterialCommunityIcons name='check-circle-outline'/>
            </TouchableHighlight>
            <TouchableHighlight onPress={goToEditList} style={styles.btn}>
            <MaterialCommunityIcons name='file-edit-outline'/>
            </TouchableHighlight>
            <TouchableHighlight onPress={goToEditHistory} style={styles.btn}>
            <MaterialCommunityIcons name='history'/>
            </TouchableHighlight>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        margin: 5,
        padding: 5,
        borderRadius: 10,
        backgroundColor: 'beige'
    },
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: 'red',
        margin: 5,
        borderRadius: 10,
        height: '100%'
    }
})

export default ShoppingListScreenItem;