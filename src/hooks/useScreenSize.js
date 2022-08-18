import { useCallback, useEffect, useState } from 'react';

import theme from '~/theme';

const useScreenSize = () => {
  const [ width, setWidth ] = useState(window.innerWidth);
  const isMobile = width <= theme.breakpoints.mobile;
  const isTablet = width < 1200 && width > theme.breakpoints.mobile;
  const isDesktop = width >= 1200;

  const updateWidth = useCallback(() => {
    setWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return { isMobile, isTablet, isDesktop, width };
};

export default useScreenSize;
