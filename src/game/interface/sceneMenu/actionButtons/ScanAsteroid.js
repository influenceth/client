import { useMemo } from 'react';
import { useHistory } from 'react-router';

import { ScanAsteroidIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useScanAsteroid from '~/hooks/useScanAsteroid';

import ActionButton from './ActionButton';

const ScanAsteroid = ({ asteroid }) => {
  const history = useHistory();
  const { data: extendedAsteroid, isLoading } = useAsteroid(asteroid.i, true);
  const { startAsteroidScan, finalizeAsteroidScan, scanStatus } = useScanAsteroid(extendedAsteroid);

  const { label, flags, handleClick } = useMemo(() => {
    switch (scanStatus) {
      default:
      case 'UNSCANNED':
        return {
          label: 'Scan Asteroid',
          flags: { attention: !isLoading, disabled: isLoading },
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
  }, [asteroid.i, isLoading, scanStatus]);

  return (
    <ActionButton
      label={label}
      flags={flags}
      icon={<ScanAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default ScanAsteroid;