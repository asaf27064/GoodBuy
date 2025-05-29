import { DefaultTheme } from 'react-native-paper'
import { COLORS } from '../styles/colors'

export default {
  ...DefaultTheme,
  roundness: 20,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.goodBuyGreen,
    accent: COLORS.goodBuyGreen,
    background: COLORS.goodBuyGrayLight,
    surface: '#fff',
    text: '#000',
    placeholder: COLORS.goodBuyGray,
    disabled: COLORS.goodBuyGrayLight,
    notification: '#f50057',
  },
}
