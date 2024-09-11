import React, { useEffect, useMemo } from '~/lib/react-debug';
import { useThrottle } from '@react-hook/throttle';

import theme from '~/theme';

const ScreensizeContext = React.createContext();

export function ScreensizeProvider({ children }) {
  const [ height, setHeight ] = useThrottle(window.innerHeight, 30, true);
  const [ width, setWidth ] = useThrottle(window.innerWidth, 30, true);

  useEffect(import.meta.url, () => {
    const updateSize = () => {
      setHeight(window.innerHeight);
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const contextValue = useMemo(import.meta.url, () => ({
    height, 
    width,
    isMobile: width <= theme.breakpoints.mobile,
    isTablet: width < 1200 && width > theme.breakpoints.mobile,
    isDesktop: width >= 1200
  }), [height, width]);

  return (
    <ScreensizeContext.Provider value={contextValue}>
      {children}
    </ScreensizeContext.Provider>
  );
}

export default ScreensizeContext;