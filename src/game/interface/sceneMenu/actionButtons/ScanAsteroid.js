import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router';

import { ScanAsteroidIcon } from '~/components/Icons';
import useScanAsteroid from '~/hooks/useScanAsteroid';
import useStore from '~/hooks/useStore';

import ActionButton from './ActionButton';

const ScanAsteroid = ({ asteroid }) => {
  const history = useHistory();
  const { startAsteroidScan, finalizeAsteroidScan, scanStatus } = useScanAsteroid(asteroid);

  const { label, flags, handleClick } = useMemo(() => {
    switch (scanStatus) {
      default:
      case 'UNSCANNED':
        return {
          label: 'Scan Asteroid',
          flags: { attention: true },
          handleClick: startAsteroidScan
        };
      case 'SCAN_READY':
        return {
          label: 'Retrieve Scan Results',
          flags: { attention: true },
          handleClick: () => {
            finalizeAsteroidScan();
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
      case 'SCANNING':
        return {
          label: 'Scanning Asteroid...',
          flags: { loading: true },
          handleClick: () => {
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
      case 'RETRIEVING':
        return {
          label: 'Retrieving Scan Results...',
          flags: { loading: true },
          handleClick: () => {
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
    }
  }, [asteroid.i, scanStatus]);

  return (
    <ActionButton
      label={label}
      flags={flags}
      icon={<ScanAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default ScanAsteroid;