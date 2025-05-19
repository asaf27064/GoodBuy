import React, {useState} from 'react';
import { View, Text, Button, Image, Touchable, TouchableHighlight, StyleSheet, TextInput} from 'react-native';
import globalStyles from '../styles/globalStyles';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';

const ProductListScreenItem = ({product, removeProduct}) => {

    const MIN_UNITS = 1;
    const MAX_UNITS = 99; // Placeholder, consider different upper limit.

    const [prodAmount, setProdAmount] = useState(product.numUnits);

    const addUnit = () => {
        product.numUnits = product.numUnits + 1;
        setProdAmount(product.numUnits);
    }

    const subtractUnit = () => {
        product.numUnits = product.numUnits - 1;
        setProdAmount(product.numUnits);
    }

    const writeAmount = () => {
        // When input is inserted manually.
    }

    const removeItem = () => {
        removeProduct(product);
    }


    return (
        <View style={styles.container}>
            <Image source={{uri: product.product.image}} style={styles.prodPic}/>
            <View style={styles.prodDesc}>
                <Text numberOfLines={1} style={globalStyles.headerText}>{product.product.name}</Text>
                <Text numberOfLines={1} style={globalStyles.text}> {product.product.category}</Text>
            </View>
            <View style={styles.prodEdit}>
                <View style={styles.prodChangeAmount}>
                    <TouchableHighlight style={styles.changeAmountButton} onPress={addUnit} disabled={prodAmount === MAX_UNITS}>
                        <MaterialCommunityIcons name="plus"/>
                    </TouchableHighlight>
                    <TextInput onEndEditing={e => {/* Check if input is a positive integer, otherwise don't update prodAmount */}}>{prodAmount}</TextInput>
                    <TouchableHighlight style={styles.changeAmountButton} onPress={subtractUnit} disabled={prodAmount === MIN_UNITS} /* Effectively can't be reduced below 1*/> 
                        <MaterialCommunityIcons name="minus"/>
                    </TouchableHighlight>
                </View>
                <View>
                    <TouchableHighlight onPress={removeItem}>
                        <MaterialCommunityIcons name="trash-can" size={16} style={styles.rmvBtn}/>
                    </TouchableHighlight>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            backgroundColor: COLORS.secondaryGray,
            borderRadius: 10,
            padding: 10,
        },

        prodPic: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: 'red',
        },

        prodDesc: {
            padding: 10,
            flex: 3,
        },

        prodEdit: {
            flexDirection: 'column',
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        prodChangeAmount: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        changeAmountButton: {
            flex: 2,
            margin: 10,
            alignItems: 'center',
            backgroundColor: 'teal',
            padding: 10
        },
        rmvBtn: {
            margin: 10
        }

    }
)

export default ProductListScreenItem;