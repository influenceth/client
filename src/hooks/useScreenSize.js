import { useEffect, useMemo } from 'react';
import { useThrottle } from '@react-hook/throttle';

import theme from '~/theme';

const useScreenSize = () => {
  const [ height, setHeight ] = useThrottle(window.innerHeight, 30, true);
  const [ width, setWidth ] = useThrottle(window.innerWidth, 30, true);
  const isMobile = width <= theme.breakpoints.mobile;
  const isTablet = width < 1200 && width > theme.breakpoints.mobile;
  const isDesktop = width >= 1200;

  // TODO: should throttle these updates
  // TODO: should also potentially move this into a context from a hook
  useEffect(() => {
    const updateSize = () => {
      setHeight(window.innerHeight);
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return useMemo(
    () => ({ isMobile, isTablet, isDesktop, height, width }),
    [isMobile, isTablet, isDesktop, height, width]
  );
};

export default useScreenSize;
