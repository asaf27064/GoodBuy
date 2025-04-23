import React from 'react';
import { View, Text, SafeAreaView, FlatList, StyleSheet, Dimensions } from 'react-native';
import globalStyles from '../styles/globalStyles';
import Recommendation from '../components/RecommendationListItem';

const { width } = Dimensions.get('window');

function RecommendationScreen({navigation}) {

    const myRecommendations = [{name: 'item1', reason: 'you always buy this'},
    {name: 'item2', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item3', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item4', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item5', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item6', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item7', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item8', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item9', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item10', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol", reason: 'I feel like it'},
    {name: 'item11', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item12', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item13', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item14', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item15', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'},
    {name: 'item16', picture:"https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg?itok=vdV0CEol",reason: 'I feel like it'}]

    const renderItem = ({ item }) => {
        return (
          <View style={styles.item}>
            <Recommendation name={item.name} reason ={item.reason} picture={item.picture} navigation={navigation}/>
          </View>
        );
      };

    return (
        <SafeAreaView style={globalStyles.container}>

            <FlatList data={myRecommendations} numColumns={2} columnWrapperStyle={styles.columnWrapper}
            renderItem={renderItem}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    columnWrapper: {
      justifyContent: 'space-between', // Evenly spaces out the columns
      paddingHorizontal: 10,
    },
    item: {
      width: width / 2 - 20, // Each item takes 1/2 of the screen width minus spacing
      borderStyle: 'dashed',
      borderColor: '#ffffff',
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop:5,
      marginBottom: 5,
      borderRadius: 5,
    },
})

export default RecommendationScreen;