
import React from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableHighlight } from 'react-native';
import globalStyles from '../styles/globalStyles';
import BouncyCheckbox from "react-native-bouncy-checkbox";

const AddListModal = ({ isVisible, onClose }) => {

    const createNewList = () => {

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
            <TextInput placeholder="name your list"></TextInput>
            <TextInput placeholder="members"></TextInput>
            <TextInput placeholder="buy until"></TextInput>
            <BouncyCheckbox text='important list?' textStyle={{ textDecorationLine: "none"}} onPress={(isChecked) => {}}/>
            <TouchableHighlight onPress={createNewList} style={globalStyles.confirmBtn}>
                <Text>Add List</Text>
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
  },
});

export default AddListModal;