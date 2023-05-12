import { Color } from 'three';

import theme from '~/theme';

const orbitColors = {
  main: new Color('#20bde5').convertSRGBToLinear(),
  error: new Color(theme.colors.error).convertSRGBToLinear(),
  success: new Color(theme.colors.success).convertSRGBToLinear(),
  white: new Color('#ffffff').convertSRGBToLinear(),
};

export default orbitColors;