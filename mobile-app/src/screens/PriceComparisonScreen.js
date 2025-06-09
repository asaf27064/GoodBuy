import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as Location from 'expo-location';
import {
  View,
  Text,
  Button,
  SafeAreaView,
  FlatList
} from 'react-native';
import { useTheme } from 'react-native-paper';
import makeGlobalStyles from '../styles/globalStyles';
import { API_BASE } from '../config';

axios.defaults.baseURL = API_BASE;

export default function PriceComparisonScreen({ route }) {
  const theme = useTheme();
  const styles = makeGlobalStyles(theme);

  const [userLocation, setUserLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [nearestStores, setNearestStores] = useState([]);

  const listProducts = route.params.list.listObj.products;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc);
      console.log(loc);
    })();
  }, []);

  const searchNearestStores = async function() {
    try {
      const response = await axios.get(
        '/api/Stores/store_search',
        { params: {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          }
        }
      );

      console.log(response.data);
      setNearestStores(response.data);
    } catch (err) {
      console.error('Error locating stores:', err);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View>
        <Text style={{ textAlign: 'right' }}>
          {item.store.storeName}
        </Text>
      </View>
    );
  };

  const priceComparator = async function() {
    const storesIds = nearestStores.map(
      item => item.store._id.$oid
    );
    const productIdsAndAmount = listProducts.map(item => ({
      productId: item.product._id,
      amount: item.numUnits
    }));

    // Demo for price comparison algorithm. Return the store with cheapest list,
    // two stores with combination of cheapest items, and closest store
    const possibleServerResponse = [
      { name: 'store1', distance: 3.14, prices: [7.67, 11.35, 29.55, 112.30, 40.12] },
      { name: 'store2', distance: 4.55, prices: [5.25, 10.22, 28.90, 101.11, 37.56] }, // Cheapest One
      { name: 'store3', distance: 2.90, prices: [7.17, 21.35, 19.55, 112.00, 45.45] }, // One item is cheaper than store2
      { name: 'store4', distance: 2.80, prices: [7.67, 9.35, 29.55, 112.30, 37.12] },   // Two items are cheaper than store2, but the price difference is not as big as store 3.
      { name: 'store5', distance: 2.00, prices: [7.67, 111.35, 29.55, 112.30, 40.12] }  // whatever
    ];
    
    try {
      const response = await axios.get(
        '/api/Products/list_price',
        {
          params: {
            stores: JSON.stringify(storesIds),
            products: JSON.stringify(productIdsAndAmount)
          }
        }
      );

      console.log(response.data);

      /*const result = {cheapestStore: "", cheapestCombination: "", closest: ""}
      const MAX_VALUE = 10000;
      let minSumPrice = MAX_VALUE;
      let minDist = MAX_VALUE;
      
      possibleServerResponse.forEach(entry => {

        let currPrice = entry.prices.reduce((partialSum, a) => partialSum + a, 0);
        let currDist = entry.distance;

        if(currPrice < minSumPrice) {
          result.cheapestStore = entry.name;
          minSumPrice = currPrice;
        }

        if(currDist < minSumPrice) {
          result.closest = entry.name;
          minDist = currDist;
        }
      });

      const numStores = possibleServerResponse.length;
      let numProducts = possibleServerResponse[0].prices.length;
      let cheapestPrices = [MAX_VALUE,MAX_VALUE,MAX_VALUE,MAX_VALUE,MAX_VALUE]
      for(let i=0; i < numStores; i++) {
        for(let j=i+1; j < numStores; j++) {
          let currentCombPrices = [MAX_VALUE,MAX_VALUE,MAX_VALUE,MAX_VALUE,MAX_VALUE]
          for (let k=0; k<numProducts; k++) {
            currentCombPrices[k] = Math.min(possibleServerResponse[i].prices[k], possibleServerResponse[j].prices[k])
          }
          if (currentCombPrices.reduce((partialSum, a) => partialSum + a, 0) < cheapestPrices.reduce((partialSum, a) => partialSum + a, 0)) {
            cheapestPrices = currentCombPrices;
            result.cheapestCombination = "Store " + (i+1) + ", " + "Store " + (j+1);
          }
        }
      }

      console.log(result);*/
    } catch (err) {
      console.error('Error fetching product prices from stores:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { flex: 1, backgroundColor: 'white' }]}>
      <Button
        title="Calculate Nearest Stores"
        onPress={searchNearestStores}
      />
      <Text>Location:</Text>
      <Text>
        {userLocation
          ? `Latitude: ${userLocation.coords.latitude}, Longitude: ${userLocation.coords.longitude}`
          : errorMsg || 'Fetching...'}
      </Text>
      <FlatList
        data={nearestStores}
        keyExtractor={(item) => item.store._id.$oid /*This is how findNearestStores handles id*/}
        renderItem={renderItem}
      />
      <Button
        title="Calculate best price"
        onPress={priceComparator}
      />
    </SafeAreaView>
  );
}
