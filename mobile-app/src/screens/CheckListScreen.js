import React, {useState} from 'react';
import axios from 'axios';
import { View, FlatList, Text, SafeAreaView, Touchable, TouchableHighlight, StyleSheet} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductCheckListItem from '../components/CheckListScreenItem';
import { COLORS } from '../styles/colors';
import ConfirmPurchaseModal from '../components/ConfirmPurchaseModal'

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

    const [isModalVisible, setModalVisible] = useState(false);


    const confirmFinishPurhcase = () => {
        setModalVisible(true);
     }
     

    const handleCloseModal = () => {
        setModalVisible(false);
     }

    const handleFinishPurchase = async function(purchasedItems) {

        const data = {
            listId: currList._id,
            timestamp: Date.now(),
            purchasedProducts: purchasedItems
        }
  
        
        // Add a "copy" of  the list to the purchase history, along with timestamp of purchase date.// Post request
        // Additionally, empty products in the list, as well as the editLog (done in controller).
        try {
            const response = await axios.post('http://192.168.0.105:3000/api/Purchases/',  data );
            console.log("Added list to your purchase history, emptied products and editlog");
            currList.products = [];
            currList.editLog = [];

        } catch (err) {
            console.error('Error adding purchase:', err);
        }

        // Show Check Icon, return to shopping list screen.
        handleCloseModal();
    }


    return (
        <SafeAreaView style={globalStyles.container}>
            <ConfirmPurchaseModal 
            isVisible={isModalVisible}
             onClose={handleCloseModal}
              purchasedItems={checkedItems}
               handlePurchase={handleFinishPurchase}
               allCheckedFlag={uncheckedItems.length == 0}/>
            <Text style={{color: 'white'}}> Products to buy:</Text>
            <FlatList data={[...uncheckedItems]} keyExtractor={(item) => item.product._id} renderItem={renderItem}/>
            {checkedItems.length > 0 && (<Text style={{color: 'white'}}> Products bought:</Text>)}
            <FlatList data={[...checkedItems]} keyExtractor={(item) => item.product._id} renderItem={renderItem}/>
            <TouchableHighlight style={{backgroundColor: 'cyan'}} onPress={confirmFinishPurhcase}>
                <Text> Finish Pruchase</Text>
            </TouchableHighlight>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({


})

export default CheckListScreen;