import { View, Text, TouchableHighlight, StyleSheet, Image} from 'react-native';
import {COLORS} from '../styles/colors'
import globalStyles from '../styles/globalStyles';

const RecommendationListItem = ({name, reason, picture, navigation}) => {

    const rmvRecommendation = () => {

    }

    const addItemToList = () => {
        // pop up window
    }

    return (
        <View style={styles.container}>
            <TouchableHighlight style={styles.rmvBtn} onPress={rmvRecommendation}>
                <Text>Remove</Text>
            </TouchableHighlight>
            <Image source={{uri: picture}} style={styles.prodPic}/>
            <Text>{name}</Text>
            <Text>{reason}</Text>
            <View>
                <TouchableHighlight style={globalStyles.confirmBtn} onPress={addItemToList}>
                    <Text>Add</Text>
                </TouchableHighlight>
            </View>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'orange',
        width: '100%',
        alignItems: 'center'
    },

    rmvBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'red'
    },

    prodPic: {
        margin: 10,
        height: 100,
        width: 100
    }
})

export default RecommendationListItem;