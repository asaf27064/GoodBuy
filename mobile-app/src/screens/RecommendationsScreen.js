import React from 'react'
import {
  View,
  SafeAreaView,
  FlatList,
  StyleSheet,
  Dimensions
} from 'react-native'
import { useTheme } from 'react-native-paper'
import makeGlobalStyles from '../styles/globalStyles'
import Recommendation from '../components/RecommendationListItem'

const { width } = Dimensions.get('window')

export default function RecommendationScreen({ navigation }) {
  const theme = useTheme()
  const globals = makeGlobalStyles(theme)
  const styles = makeStyles(theme)

  const myRecommendations = [
    { name: 'item1', reason: 'you always buy this' },
    { name: 'item2', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item3', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item4', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item5', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item6', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item7', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item8', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item9', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item10', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item11', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item12', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item13', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item14', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item15', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' },
    { name: 'item16', picture: 'https://www.nestleprofessional.co.il/sites/default/files/styles/np_product_detail/public/product_images/6930925_7290000066196.jpg', reason: 'I feel like it' }
  ]

  const renderItem = ({ item, index }) => (
    <View style={styles.item}>
      <Recommendation
        name={item.name}
        reason={item.reason}
        picture={item.picture}
        navigation={navigation}
      />
    </View>
  )

  return (
    <SafeAreaView style={globals.container}>
      <FlatList
        data={myRecommendations}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item.name + idx}
      />
    </SafeAreaView>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    columnWrapper: {
      justifyContent: 'space-between',
      paddingHorizontal: 10
    },
    item: {
      width: width / 2 - 20,
      borderStyle: 'dashed',
      borderColor: theme.colors.onSurface,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 5,
      borderRadius: theme.roundness
    }
  })
}
