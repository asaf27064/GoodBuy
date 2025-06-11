import React from 'react'
import { Modal, View, Text, TouchableHighlight, StyleSheet } from 'react-native'
import globalStyles from '../styles/globalStyles'

export default function ConfirmPurchaseModal({
  isVisible,
  onClose,
  purchasedItems,    // array of { product: {...}, numUnits }
  handlePurchase,
  allCheckedFlag
}) {
  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <TouchableHighlight onPress={onClose}>
            <Text>✕</Text>
          </TouchableHighlight>
          {!allCheckedFlag && <Text style={styles.warn}>You still have unchecked items.</Text>}
          <Text style={styles.prompt}>Have you finished your shopping?</Text>
          <Text style={styles.sub}>
            Confirming will empty the list and record the checked items in your history.
          </Text>
          <TouchableHighlight
            style={globalStyles.confirmBtn}
            onPress={() => handlePurchase(purchasedItems)}
          >
            <Text>Confirm</Text>
          </TouchableHighlight>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  container: {
    width: '80%', padding: 16, backgroundColor: 'white',
    borderRadius: 8, alignItems: 'center'
  },
  warn: { marginBottom: 8, color: 'tomato' },
  prompt: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  sub: { fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 16 }
})
