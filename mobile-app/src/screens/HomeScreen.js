import React from 'react';
import { View, Text, Button, Touchable, TouchableHighlight, SafeAreaView } from 'react-native';
import globalStyles from '../styles/globalStyles';

function HomeScreen({navigation}) {
    return (
        <SafeAreaView style={globalStyles.container}>
            <View><Text>Hello, Guy</Text></View>
        </SafeAreaView>
        
    );
}

export default HomeScreen;