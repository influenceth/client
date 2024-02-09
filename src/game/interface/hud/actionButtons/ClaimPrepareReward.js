import { useCallback, useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import { ClaimRewardIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const isVisible = ({ account, asteroid }) => {
  const owner = asteroid?.Nft?.owner ? Address.areEqual(asteroid?.Nft?.owner, account) : false;
  return owner && asteroid?.AsteroidReward?.hasPrepareForLaunchCrewmate;
};

const ClaimPrepareReward = ({ asteroid, onSetAction, _disabled }) => {
  const handleClick = useCallback(() => {
    onSetAction('CLAIM_PREPARE_REWARD', { asteroid });
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
  }, [_disabled]);

  return (
    <ActionButton
      label={'Claim Crewmate'}
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

export default { Component: ClaimPrepareReward, isVisible };