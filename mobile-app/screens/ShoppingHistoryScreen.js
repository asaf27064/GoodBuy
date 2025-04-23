import React from 'react';
import { View, Text, Button, SafeAreaView } from 'react-native';
import globalStyles from '../styles/globalStyles';

function PriceComparisonScreen({navigation}) {
    return (
        <SafeAreaView style={globalStyles.container}>
            <Button title="Return" onPress={() => { navigation.goBack(null)}} />
            <Text>History</Text>
            </SafeAreaView>
    );
}

export default PriceComparisonScreen;