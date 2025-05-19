import React, {useState} from 'react';
import { View, Text, Button, Image, Touchable, TouchableHighlight, StyleSheet, TextInput} from 'react-native';
import globalStyles from '../styles/globalStyles';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';
import BouncyCheckbox from "react-native-bouncy-checkbox";

const CheckListScreenItem = ({product, checkStatus, handleCheck}) => {

    return (
        <View style={styles.container}>
            <BouncyCheckbox  fillColor= {COLORS.goodBuyGreen} isChecked={checkStatus} onPress={() => {handleCheck(product);}}/>
            <Text style={{color: 'white', textDecorationLine: checkStatus ? 'line-through' : 'none'}}> {product.product.name} X{product.numUnits}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            padding: 10,
            margin: 10,
            borderBottomWidth: 2,
            borderBottomColor: COLORS.secondaryGray
        },
    }
)

export default CheckListScreenItem;