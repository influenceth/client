import { useCallback, useMemo } from '~/lib/react-debug';
import { Address } from '@influenceth/sdk';

import { ClaimRewardIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const isVisible = ({ account, asteroid }) => {
  if (!account || !asteroid?.Nft?.owner) return false;
  const owner = Address.areEqual(asteroid?.Nft?.owner, account);
  return owner && asteroid?.AsteroidReward?.hasPrepareForLaunchCrewmate;
};

const ClaimPrepareReward = ({ asteroid, onSetAction, _disabled }) => {
  const handleClick = useCallback(import.meta.url, () => {
    onSetAction('CLAIM_PREPARE_REWARD', { asteroid });
  }, [onSetAction]);

  const disabledReason = useMemo(import.meta.url, () => {
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