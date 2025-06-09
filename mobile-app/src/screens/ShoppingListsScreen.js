import React, { useState } from 'react';
import axios from 'axios';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableHighlight,
  SafeAreaView,
  Text
} from 'react-native';
import { useTheme } from 'react-native-paper';
import makeGlobalStyles from '../styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShoppingList from '../components/ShoppingListScreenItem';
import EditListScreen from './EditListScreen';
import CheckListScreen from './CheckListScreen';
import EditHistoryScreen from './EditHistoryScreen';
import RecommendationScreen from './RecommendationsScreen';
import PriceComparisonScreen from './PriceComparisonScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddListModal from '../components/AddListModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE } from '../config';

// Set base URL for axios
axios.defaults.baseURL = API_BASE;

MaterialCommunityIcons.loadFont();
const Stack = createNativeStackNavigator();

export const ShoppingListStack = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary || '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <MaterialCommunityIcons.Button
            name="menu"
            size={28}
            color={theme.colors.onPrimary || '#fff'}
            backgroundColor={theme.colors.primary}
            onPress={() => navigation.openDrawer()}
            iconStyle={{ marginRight: 0 }}
            style={{ paddingHorizontal: 16 }}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          />
        ),
        headerRightContainerStyle: { paddingRight: 0 }
      })}
    >
      <Stack.Screen
        name="MyShoppingLists"
        component={ShoppingListScreen}
        options={{ title: 'My Shopping Lists', headerShown: false }}
      />
      <Stack.Screen
        name="CheckItems"
        component={CheckListScreen}
        options={({ route }) => ({
          title: `${route.params.list.listObj.title}: Check Items`
        })}
      />
      <Stack.Screen
        name="EditItems"
        component={EditListScreen}
        options={({ route }) => ({
          title: `${route.params.list.listObj.title}: Edit List`
        })}
      />
      <Stack.Screen
        name="EditHistory"
        component={EditHistoryScreen}
        options={({ route }) => ({
          title: `${route.params.list.listObj.title}: Edit History`
        })}
      />
      <Stack.Screen
        name="Recommend"
        component={RecommendationScreen}
        options={({ route }) => ({
          title: `${route.params.list.listObj.title}: Suggestions`
        })}
      />
      <Stack.Screen
        name="Compare"
        component={PriceComparisonScreen}
        options={({ route }) => ({
          title: `${route.params.list.listObj.title}: Price Comparison`
        })}
      />
    </Stack.Navigator>
  );
};

export default function ShoppingListScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeGlobalStyles(theme);
  const insets = useSafeAreaInsets();

  const [isModalVisible, setModalVisible] = useState(false);
  const [shoppingLists, setShoppingLists] = useState([]);

  const addList = () => setModalVisible(true);
  const handleCloseModal = () => setModalVisible(false);

  const createNewList = async (title, members, important) => {
    try {
      const { data } = await axios.post(
        '/api/ShoppingLists',
        { title, members: [members], importantList: important }
      );
      setShoppingLists(prev => [...prev, data]);
      handleCloseModal();
    } catch (err) {
      console.error('Error creating list:', err);
    }
  };

  const renderItem = ({ item }) => (
    <View style={localStyles.shopList}>
      <ShoppingList
        listObj={item}
        listId={item._id}
        members={item.members}
        title={item.title}
        products={item.products}
        editLog={item.editLog}
        navigation={navigation}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AddListModal
        isVisible={isModalVisible}
        onClose={handleCloseModal}
        createList={createNewList}
      />
      <FlatList
        data={shoppingLists}
        renderItem={renderItem}
        ListFooterComponent={<View />}
        ListFooterComponentStyle={{
          flex: 1,
          height: 120,
          marginTop: 10,
          justifyContent: 'flex-end'
        }}
      />
      <TouchableHighlight
        onPress={addList}
        style={[
          localStyles.addListBtn,
          { bottom: insets.bottom + 60 + 10 }
        ]}
      >
        <MaterialCommunityIcons
          name="plus"
          color={theme.colors.onPrimary || '#fff'}
          size={28}
        />
      </TouchableHighlight>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  shopList: {
    flex: 1,
    borderRadius: 10,
    marginTop: 10,
    marginHorizontal: 10,
    backgroundColor: 'pink'
  },
  addListBtn: {
    backgroundColor: theme => theme.colors.primary,
    position: 'absolute',
    right: 0,
    alignItems: 'center',
    marginRight: 20,
    padding: 20,
    borderColor: theme => theme.colors.primary,
    borderWidth: 2,
    borderRadius: 20
  }
});
