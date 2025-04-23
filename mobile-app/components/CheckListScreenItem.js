import React, {useState} from 'react';
import { View, Text, Button, Image, Touchable, TouchableHighlight, StyleSheet, TextInput} from 'react-native';
import globalStyles from '../styles/globalStyles';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';
import BouncyCheckbox from "react-native-bouncy-checkbox";

const CheckListScreenItem = ({product}) => {

    const [checkboxState, setCheckboxState] = React.useState(false);

    return (
        <View style={styles.container}>
            <BouncyCheckbox  onPress={(isChecked) => {setCheckboxState(isChecked)}}/>
            <Text style={{textDecorationLine: checkboxState ? "line-through" : "none"}}> {product.name} X{product.numUnits}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            backgroundColor: 'coral',
            padding: 10,
            margin: 10,
            borderBottomWidth: 2,
            borderBottomColor: COLORS.secondaryGray
        },

    }
)

export default CheckListScreenItem;