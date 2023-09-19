import { useMemo } from 'react';
import { useHistory } from 'react-router';
import { Asteroid } from '@influenceth/sdk';

import { ScanAsteroidIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useScanManager from '~/hooks/useScanManager';

import ActionButton from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';

const ScanAsteroid = ({ asteroid, _disabled }) => {
  const history = useHistory();
  const { scanStatus, scanType } = useScanManager(asteroid);
  const { crew } = useCrewContext();

  const { label, flags, handleClick } = useMemo(() => {
    let flags = {
      attention: undefined,
      disabled: _disabled || undefined,
      disabledReason: '',
      loading: undefined,
      finishTime: asteroid?.Celestial?.scanFinishTime
    }

    // resource scan requires crew to be on asteroid
    if (scanType === 'RESOURCE' && (!crew._location.asteroidId || crew._location.asteroidId !== asteroid?.id)) {
      flags.disabled = true;
      flags.disabledReason = 'Crew must be Present';
    }

    switch (scanStatus) {
      default:
      case 'UNSCANNED':
        flags.attention = flags.disabled ? false : true;
        return {
          label: `Scan Asteroid ${scanType === 'SURFACE' ? 'Surface' : 'Resources'}`,
          flags,
          handleClick: () => {
            // startAsteroidScan();
            history.push(`/asteroids/${asteroid.id}/resources`);
          },
        };
      case 'SCANNING':
        flags.loading = true;
        return {
          label: `Scanning Asteroid ${scanType === 'SURFACE' ? 'Surface' : 'Resources'}...`,
          flags,
          handleClick: () => {
            history.push(`/asteroids/${asteroid.id}/resources`);
          }
        };
      case 'READY_TO_FINISH':
        flags.attention = flags.disabled ? false : true;
        return {
          label: 'Retrieve Scan Results',
          flags,
          handleClick: () => {
            // finalizeAsteroidScan();
            history.push(`/asteroids/${asteroid.id}/resources`);
          }
        };
      case 'FINISHING':
        flags.loading = true;
        return {
          label: 'Retrieving Scan Results...',
          flags,
          handleClick: () => {
            history.push(`/asteroids/${asteroid.id}/resources`);
          }
        };
    }
  }, [asteroid?.id, scanStatus, _disabled]);

  // TODO: icon should probably be distinct for each scan type
  return (
    <ActionButton
      label={`${label}${flags.disabledReason ? ` (${flags.disabledReason})` : ''}`}
      flags={flags}
      icon={<ScanAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default ScanAsteroid;