import React, {useState, useRef} from 'react';
import axios from 'axios';
import { View, FlatList, Text, Image, SafeAreaView, TouchableHighlight, TextInput, StyleSheet, Dimensions} from 'react-native';
import globalStyles from '../styles/globalStyles';
import ProductListItem from '../components/EditListScreenItem';
import { COLORS } from '../styles/colors';
import debounce from 'lodash/debounce'; // delay requests being sent to the sever. TODO: add limit on the server side.


const { height } = Dimensions.get('window');

function EditListScreen({route}) {


    const WAIT_TIME = 300;

    const renderItem = ({item}) => {
        return (
            <View style={styles.itemContainer}>
                <ProductListItem product = {item} removeProduct={removeProduct}/>
            </View>
        );
    }

    const compareLists = (oldList, newList) => {

        const editedBy = 'Me'; //Replace with current User
        let newEdits = [];

        console.log("in");
        console.log(oldList);
        console.log(newList);

        // Find removed items (present in oldList but not in newList)
        oldList.forEach(oldItem => {
            const newItem = newList.find(newItem => newItem.product._id === oldItem.product._id);
            
            if (!newItem) {

                newEdits.push({product: oldItem.product, changedBy: editedBy, action: 'removed', timeStamp: new Date()}); // Item is in old but not in new
            } else if (oldItem.numUnits !== newItem.numUnits) {
                
                newEdits.push(
                    {product: oldItem.product,
                    changedBy: editedBy, 
                    action: 'updated',
                    timeStamp: new Date(),
                    diffrence: newItem.numUnits-oldItem.numUnits}); // Item exists in both, but the amount changed
            }
        });

        // Find added items (present in newList but not in oldList)
        newList.forEach(newItem => {
            const oldItem = oldList.find(oldItem => oldItem.product._id === newItem.product._id);
            if (!oldItem) {

                newEdits.push({product: newItem.product, changedBy: editedBy, action: 'added', timeStamp: new Date()}); // Item is in new but not in old
            }

        });

        return newEdits;
    };
    
    
    const currList = route.params.list.listObj;
    
    
    const [products, setProducts] = useState(currList.products);
    const initialProducts = useRef(JSON.parse(JSON.stringify(currList.products))); // track initial value without referencing the original.

    // Something doesn't work here.
    const removeProduct = (productToRemove) => {
        let newProducts = [];
        newProducts = products.filter(e => e !== productToRemove);
        setProducts(newProducts);
    }

    const [searchBarInput, setSeachBarInput] = useState('');
    const [searchMatches, setSearchMatches] = useState([]);
    const [loading, setLoading] = useState(false); // For trigerring loading animation and more TODO: use it.

    const handleInputChange = (productName) => {
        console.log(productName);
        setSeachBarInput(productName);
        fetchProducts(productName);
    };

    const fetchProducts = debounce(async function(productName) {

        // If input only contains whitespaces, ignore.
        if (productName.trim() === '') {
            setSearchMatches([]);
            return;
          }
        //setLoading(true);
        console.log("Attempting to search products...");
        try {
            const response = await axios.get('http://192.168.0.105:3000/api/Products/search/' + productName);
            setSearchMatches(response.data.results);
        } catch (err) {
            console.error('Error getting products:', err);
        } /*finally {
            setLoading(false);
        }*/

        }, WAIT_TIME); // wait for WAIT_TIME miliseconds during which the textInput is unchanged, before sending the request.
    

    const addNewProduct = async function(newProduct) {
        // replace "productId" with a full product from the list, same with response.data
        console.log(newProduct);
        setProducts([...products, {product: newProduct, numUnits: 1}]);
        setSeachBarInput('');
        setSearchMatches([]);
    };

    const saveProductsChanges = async function() {


        currList.products = products;

        const newEditLog = compareLists(initialProducts.current, products); // To allow for tracking edit log.
        
        currList.editLog = [...currList.editLog, ...newEditLog];
        console.log(currList);
        
        data = {
            list: currList,
            changes: newEditLog
        }

        console.log(data);

        try {
            const response = await axios.put('http://192.168.0.105:3000/api/ShoppingLists/' + currList._id,  data);

            console.log("changes saved");
            initialProducts.current = JSON.parse(JSON.stringify(products));
          } catch (err) {
            console.error('Error saving changes:', err);
          }
    
    };


    return (
        <SafeAreaView style={globalStyles.container} >
            <View style={styles.topContainer}>
                <View style={styles.itemSearchBar}>
                        <TextInput placeholder="Search Item..." value={searchBarInput} onChangeText={handleInputChange}></TextInput>
                </View>
                {searchMatches.length > 0 && (
                            <FlatList
                            data={searchMatches}
                            keyExtractor={(item) => item._id}
                            style={styles.dropList}
                            renderItem={({ item }) => (
                                <View style={styles.dropListItem}>
                                <TouchableHighlight onPress={() => addNewProduct(item)}>
                                    <View style={{flexDirection: 'row', padding: 10, alignItems: 'center'}}>
                                        <Image source={{uri: item.image}} style={styles.dropListImage}/>
                                        <Text>{item.name}</Text>
                                    </View>
                                </TouchableHighlight>
                                </View>
                            )}
                            />
                            )}
            </View>
            <FlatList data={products} style = {styles.prodList}
            renderItem={renderItem}
            />
            <View style={styles.saveChangesBtn}>
                <TouchableHighlight onPress={saveProductsChanges} /*Disable when no changes have occured*/>
                    <Text>Save Changes</Text>
                </TouchableHighlight>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    topContainer: {
        margin: 10,
    },
    itemSearchBar: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBlockColor: 'red',
    }, 
    prodList: {
        margin: 10,
        /*borderRadius:20,
        borderWidth: 2,
        borderStyle: 'dashed',*/
        borderColor: COLORS.white
    },
    itemContainer: {
        borderRadius: 10,
        borderBottomWidth: 2,
        borderBottomColor: 'red'

    },
    saveChangesBtn: {
        backgroundColor: COLORS.goodBuyGreen,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    }, 

    // Design from here is really messy, revisit if time allows
    dropList: {
        position: 'absolute',
        top: '100%',
        width: '100%',
        maxHeight: height / 4, // Limit Items suggested to cover 25% of the screen at most
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        zIndex: 1000,
    }, 
    dropListItem: {
        borderBottomWidth: 1,
        width: '100%',
    }, 
    dropListImage: {
        marginRight: 10,
        width: '10%',
        height: undefined,
        aspectRatio: 1,
    }
})

export default EditListScreen;