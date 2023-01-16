import { useMemo } from 'react';
import { useHistory } from 'react-router';

import { ScanAsteroidIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useScanManager from '~/hooks/useScanManager';

import ActionButton from './ActionButton';

const ScanAsteroid = ({ asteroid, _disabled }) => {
  const history = useHistory();
  const { data: extendedAsteroid, isLoading } = useAsteroid(asteroid?.i, true);
  const { scanStatus } = useScanManager(extendedAsteroid);

  const { label, flags, handleClick } = useMemo(() => {
    let flags = {
      attention: undefined,
      disabled: _disabled || undefined,
      loading: undefined,
    }
    switch (scanStatus) {
      default:
      case 'UNSCANNED':
        if (isLoading) flags.disabled = true;
        else flags.attention = true;
        return {
          label: 'Scan Asteroid',
          flags,
          handleClick: () => {
            // startAsteroidScan();
            history.push(`/asteroids/${asteroid.i}/resources`);
          },
        };
      case 'SCANNING':
        flags.loading = true;
        return {
          label: 'Scanning Asteroid...',
          flags,
          handleClick: () => {
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
      case 'READY_TO_FINISH':
        flags.attention = true;
        flags.badge = '✓';
        return {
          label: 'Retrieve Scan Results',
          flags,
          handleClick: () => {
            // finalizeAsteroidScan();
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
      case 'FINISHING':
        flags.loading = true;
        return {
          label: 'Retrieving Scan Results...',
          flags,
          handleClick: () => {
            history.push(`/asteroids/${asteroid.i}/resources`);
          }
        };
    }
  }, [asteroid?.i, isLoading, scanStatus, _disabled]);

  return (
    <ActionButton
      label={label}
      flags={flags}
      icon={<ScanAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default ScanAsteroid;