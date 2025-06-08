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

    const goToSuggestions = () => {
        //console.log({listId})
        navigation.navigate('Recommend', {list: {listObj}})
    }

    const goToPriceComparison = () => {
        //console.log({listId})
        navigation.navigate('Compare', {list: {listObj}})
    }


    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={globalStyles.headerText}>{title}</Text>
                <Text>members: {members.map((user) => user.username + ', ') /* remove ',' from last member*/} </Text>
            </View>
            <View style={styles.buttonsContainer}>
                <TouchableHighlight onPress={goToEditList} style={styles.btn}>
                    <MaterialCommunityIcons name='file-edit-outline' size={30}/>
                </TouchableHighlight>
                <View style={styles.separator} />
                <TouchableHighlight onPress={goToSuggestions} style={styles.btn}>
                    <MaterialCommunityIcons name='thumb-up-outline' size={30}/>
                </TouchableHighlight>
                <View style={styles.separator} />
                <TouchableHighlight onPress={goToPriceComparison} style={styles.btn}>
                    <MaterialCommunityIcons name='scale-unbalanced'  size={30}/>
                </TouchableHighlight>
                <View style={styles.separator} />
                <TouchableHighlight onPress={goToCheckList} style={styles.btn}>
                    <MaterialCommunityIcons name='check-circle-outline' size={30}/>
                </TouchableHighlight>
                <View style={styles.separator} />
                <TouchableHighlight onPress={goToEditHistory} style={styles.btn}>
                    <MaterialCommunityIcons name='history' size={30}/>
                </TouchableHighlight>
            </View>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: 'beige'
    },

    textContainer: {
        flex: 1,
        margin: 10
    },

    buttonsContainer: {
        flex: 1,
        flexDirection: 'row',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        backgroundColor: 'red',
    },
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
        
        flex: 1,
        padding: 20,
    },
    separator: {
        backgroundColor: "black",
        width: 1
    }
})

export default ShoppingListScreenItem;