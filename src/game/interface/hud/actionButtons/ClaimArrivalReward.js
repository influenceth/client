import { useCallback, useMemo } from 'react';
import { Address, Asteroid } from '@influenceth/sdk';

import { ClaimRewardIcon } from '~/components/Icons';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const isVisible = ({ account, asteroid, crew }) => {
  const owner = asteroid?.Nft?.owner ? Address.areEqual(asteroid?.Nft?.owner, account) : false;
  const controller = asteroid?.Control?.controller?.id === crew?.id;
  return owner && controller && asteroid?.AsteroidReward?.hasArrivalStarterPack;
};

const ClaimArrivalReward = ({ asteroid, crew, onSetAction, _disabled }) => {
  const handleClick = useCallback(() => {
    onSetAction('CLAIM_ARRIVAL_REWARD', { asteroid, crew});
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (asteroid?.Celestial?.scanStatus < Asteroid.SCAN_STATUSES.SURFACE_SCANNED) return 'asteroid un-scanned';
    return getCrewDisabledReason({ asteroid, crew, requireAsteroid: false, requireSurface: false });
  }, [_disabled, asteroid, crew]);

  return (
    <ActionButton
      label={'Claim Starter Pack'}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        attention: true,
        loading: false
      }}
      icon={<ClaimRewardIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ClaimArrivalReward, isVisible };