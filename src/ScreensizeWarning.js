import { useState } from 'react';

import appConfig from '~/appConfig';
import FullpageInterstitial from '~/components/FullpageInterstitial';
import useScreenSize from '~/hooks/useScreenSize';
import theme from '~/theme';

const disableScreensizeWarning = appConfig.get('App.disableScreensizeWarning');

const ScreensizeWarning = () => {
  const { height, width } = useScreenSize();
  const [dismissed, setDismissed] = useState();

  if (dismissed || (height > 796 && width > theme.breakpoints.mobile) || disableScreensizeWarning) return null;
  return (
    <FullpageInterstitial
      message={
        <div style={{ width: '540px', maxWidth: '92vw', margin: '0 auto', textAlign: 'center' }}>
          WARNING: Influence is not yet optimized for smaller screen sizes. We kindly recommend switching devices before playing.
        </div>
      }
      onSkip={() => setDismissed(true)}
      skipContent="Proceed Anyway"
      style={{ background: 'black', zIndex: 9999 }} />
  );
};

export default ScreensizeWarning;