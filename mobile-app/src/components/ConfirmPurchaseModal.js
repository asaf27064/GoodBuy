
import React, {useState} from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableHighlight } from 'react-native';
import globalStyles from '../styles/globalStyles';
import BouncyCheckbox from "react-native-bouncy-checkbox";

const uncheckedMessage = "You still have unchecked items."

const AddListModal = ({ isVisible, onClose, purchasedItems, handlePurchase, allCheckedFlag}) => {

  const confirmPruchase = () => {
    handlePurchase(purchasedItems);
  }

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
            <TouchableHighlight onPress={onClose}>
                <Text>Close</Text>
            </TouchableHighlight>
            <View style={styles.textContainer}>
                {!allCheckedFlag && (<Text>{uncheckedMessage}</Text>)}       
                <Text>Have you finished your shopping?{'\n'}</Text>
                <Text style={{fontSize: 11}}>Confirming will empty the list and add checked items to purchase history.</Text>
            </View>
            <TouchableHighlight onPress={confirmPruchase} style={globalStyles.confirmBtn}>
                <Text>Confirm</Text>
            </TouchableHighlight>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContainer: {
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AddListModal;