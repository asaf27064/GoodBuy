import React, {useState} from 'react';
import { View, Text, Button, Image, Touchable, TouchableHighlight, StyleSheet, TextInput} from 'react-native';
import globalStyles from '../styles/globalStyles';
import  MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { COLORS } from '../styles/colors';

const EditHistoryScreenItem = ({changedProd, changedBy, action, timeStamp,}) => {
    
    
    const defineBackgroundColor = (action) => {

        let color = 'white';
        if (action === "added") {
            color = COLORS.muteGreen;
        } else if (action === "removed") {
            color = COLORS.muteRed;
        } else if (action === "updated") {
            color = COLORS.muteYellow;
        }
        
        return color;
    }

    const bgColor = defineBackgroundColor(action);
    const formatedDate =  timeStamp.getHours() + ':' + timeStamp.getMinutes() + ' ,' + timeStamp.getDay() + '/' + timeStamp.getMonth() + '/' + timeStamp.getFullYear();

    return (
        <View style={[styles.container, {backgroundColor: bgColor}]}>
            <Image source={{uri: changedProd.image}} style={styles.prodPic}/>
            <View style={styles.editDetails}>
                <Text style={globalStyles.headerText}>{changedProd.name}</Text>
                <Text>{action} by {changedBy} at {formatedDate}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
        container: {
            borderRadius: 10,
            margin: 10,
            padding: 10,
            flexDirection: 'row'
        },

        prodPic: {
            flex: 1,
            alignItems: 'center',
            width: '100%',
            height: undefined,
            aspectRatio: 1,
        },

        editDetails: {
            flex: 3,
            flexDirection: 'column',
            marginLeft: 10,
        }

    }
)

export default EditHistoryScreenItem;