import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';

/** Intrinsic sizes of the exported rasters in `assets/brand/` (see .cursor/brand-assets.md). */
const WORDMARK_ASPECT = 1200 / 309;
const MARK_ASPECT = 453 / 512;

type Props = {
  /** Rendered height in points; width follows the artwork's aspect ratio. */
  height: number;
  style?: StyleProp<ImageStyle>;
};

/** Mark + "SermonRecall" lockup, light or dark ink to match the active theme. */
export function BrandWordmark({ height, style }: Props) {
  const { resolved } = useRecallionTheme();
  return (
    <Image
      source={
        resolved === 'dark'
          ? require('../assets/brand/wordmark-dark.png')
          : require('../assets/brand/wordmark-light.png')
      }
      style={[{ height, width: height * WORDMARK_ASPECT }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Sermon Recall"
    />
  );
}

/** Doorway + SR + book mark on a transparent background (works on both themes). */
export function BrandMark({ height, style }: Props) {
  return (
    <Image
      source={require('../assets/brand/mark.png')}
      style={[{ height, width: height * MARK_ASPECT }, style]}
      resizeMode="contain"
      accessible={false}
    />
  );
}
