import { StyleSheet } from "react-native-web";
import { COLORS } from "./colors";

const globalStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#171717'
    },
    header: {
      fontSize: 24,
      marginBottom: 10
    },
    item: {
      fontSize: 18,
      marginVertical: 5
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      marginVertical: 10
    },
    footer: {
        backgroundColor: 'red',
        width: '100%',
        height: '12%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        position: 'absolute',
        bottom: 0
    },
    shopList: {
      margin: '10',
      flex: 1,
      alignItems: 'center',
      backgroundColor: "gray"
    },
    confirmBtn: {
      backgroundColor: COLORS.goodBuyGreen,
      padding: 10,
      margin: 5,
      borderRadius: 10
    },

    headerText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white'
    }, 
    text: {
      color: 'white'
    }, 
    
  });

export default globalStyles;