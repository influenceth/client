import { useContext } from '~/lib/react-debug';

import ScreensizeContext from '~/contexts/ScreensizeContext';

const useScreenSize = () => {
  return useContext(ScreensizeContext);
};

export default useScreenSize;
