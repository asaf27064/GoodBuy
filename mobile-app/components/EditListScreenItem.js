import React, {useState} from 'react';
import { View, Text, Button, Image, Touchable, TouchableHighlight, StyleSheet, TextInput} from 'react-native';
import globalStyles from '../styles/globalStyles';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';

const ProductListScreenItem = ({product}) => {

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
        // add when server functionality works
    }

    return (
        <View style={styles.container}>
            <Image source={{uri: product.picture}} style={styles.prodPic}/>
            <View style={styles.prodDesc}>
                <Text numberOfLines={1} style={globalStyles.headerText}>{product.name}</Text>
                <Text numberOfLines={1}>Price: {product.price}</Text>
                <Text numberOfLines={1}>Total Price: {product.price * prodAmount}</Text>
            </View>
            <View style={styles.prodEdit}>
                <View style={styles.prodChangeAmount}>
                    <TouchableHighlight style={styles.changeAmountButton} onPress={addUnit} disabled={prodAmount === MAX_UNITS}>
                        <MaterialCommunityIcons name="plus"/>
                    </TouchableHighlight>
                    <TextInput>{prodAmount}</TextInput>
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
            backgroundColor: COLORS.goodBuyGray,
            padding: 10,
            borderBottomWidth: 2,
            borderBottomColor: COLORS.secondaryGray
        },

        prodPic: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: 'red',
        },

        prodDesc: {
            flex: 3,
            backgroundColor: 'gold'
        },

        prodEdit: {
            flexDirection: 'column',
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'green'
        },
        prodChangeAmount: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'green'
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