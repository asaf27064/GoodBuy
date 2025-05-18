
import React, {useState} from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableHighlight } from 'react-native';
import globalStyles from '../styles/globalStyles';
import BouncyCheckbox from "react-native-bouncy-checkbox";


const AddListModal = ({ isVisible, onClose, createList}) => {

  const [titleText, setTitleText] = useState('');
  const [membersText, setMembersText] = useState(''); //Currently converted to list, eventually should be handled as a list of users
  const [importantListBool, setImportantListBool] = useState(false);

  const addNewList = () => {
    createList(titleText, membersText, importantListBool);
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
            <TextInput placeholder="name your list" onChangeText={text =>{setTitleText(text)}}></TextInput>
            <TextInput placeholder="members" onChangeText={text =>{setMembersText(text)}}></TextInput>
            <BouncyCheckbox text='important list?' textStyle={{ textDecorationLine: "none"}} onPress={(isChecked) => {setImportantListBool(isChecked)}}/>
            <TouchableHighlight onPress={addNewList} style={globalStyles.confirmBtn}>
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