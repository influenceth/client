import { useEffect, useState } from 'react';

const useScreenSize = () => {
  const [ width, setWidth ] = useState(window.innerWidth);
  const isMobile = width < 400;
  const isTablet = width < 1200 && width >= 400;
  const isDesktop = width >= 1200;

  const updateWidth = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

export default useScreenSize;
