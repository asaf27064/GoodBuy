import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Card, IconButton, TextInput, Text, useTheme } from 'react-native-paper';

export default function EditListScreenItem({ product, removeProduct }) {
  const theme = useTheme();
  const MIN = 1;
  const MAX = 99;
  const [qty, setQty] = useState(product.numUnits);

  const changeQty = (delta) => {
    const newQty = Math.min(Math.max(qty + delta, MIN), MAX);
    product.numUnits = newQty;
    setQty(newQty);
  };

  const onInputChange = (text) => {
    const n = parseInt(text, 10);
    if (!isNaN(n)) {
      const clamped = Math.min(Math.max(n, MIN), MAX);
      product.numUnits = clamped;
      setQty(clamped);
    } else {
      setQty(MIN);
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>      
      <Card.Content style={styles.row}>
        <Image
          source={{ uri: product.product.image }}
          style={styles.image}
        />

        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            {product.product.name}
          </Text>
          <Text style={[styles.category, { color: theme.colors.onSurfaceVariant }]}> 
            {product.product.category}
          </Text>
        </View>

        <View style={styles.side}>
          <View style={styles.qtyRow}>
            <IconButton
              icon="minus"
              size={20}
              onPress={() => changeQty(-1)}
              disabled={qty <= MIN}
              containerColor="transparent"
              iconColor={theme.colors.primary}
            />
            <TextInput
              value={String(qty)}
              onChangeText={onInputChange}
              mode="outlined"
              keyboardType="numeric"
              outlineColor={theme.colors.primary}
              activeOutlineColor={theme.colors.primary}
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              contentStyle={styles.inputContent}
            />
            <IconButton
              icon="plus"
              size={20}
              onPress={() => changeQty(1)}
              disabled={qty >= MAX}
              containerColor="transparent"
              iconColor={theme.colors.primary}
            />
          </View>
          <IconButton
            icon="trash-can-outline"
            size={20}
            onPress={() => removeProduct(product)}
            iconColor={theme.colors.error}
            containerColor="transparent"
            style={styles.remove}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  info: {
    flex: 1.5,
    justifyContent: 'center',
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    marginTop: 2,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    width: 40,
    height: 36,
    marginHorizontal: 4,
  },
  inputContent: {
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: 14,
    justifyContent: 'center',
    textAlignVertical: 'center'
  },
  remove: {
    marginTop: 4,
  },
});
