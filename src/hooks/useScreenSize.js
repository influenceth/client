import { useCallback, useEffect, useState } from 'react';

import theme from '~/theme';

const useScreenSize = () => {
  const [ height, setHeight ] = useState(window.innerHeight);
  const [ width, setWidth ] = useState(window.innerWidth);
  const isMobile = width <= theme.breakpoints.mobile;
  const isTablet = width < 1200 && width > theme.breakpoints.mobile;
  const isDesktop = width >= 1200;

  const updateSize = useCallback(() => {
    setHeight(window.innerHeight);
    setWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  return { isMobile, isTablet, isDesktop, height, width };
};

export default useScreenSize;
