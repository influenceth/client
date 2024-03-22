import { useContext } from 'react';

import ScreensizeContext from '~/contexts/ScreensizeContext';

const useScreenSize = () => {
  return useContext(ScreensizeContext);
};

export default useScreenSize;
