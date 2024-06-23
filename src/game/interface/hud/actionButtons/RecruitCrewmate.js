import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Building, Permission } from '@influenceth/sdk';

import { RecruitCrewmateIcon } from '~/components/Icons';  // TODO: sergey's
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import useStore from '~/hooks/useStore';
import { nativeBool, reactBool } from '~/lib/utils';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const isVisible = ({ account, building }) => {
  return account && building?.Building?.buildingType === Building.IDS.HABITAT;
};

const RecruitCrewmate = ({ asteroid, crew, lot, _disabled }) => {
  const { getPendingCrewmate } = useCrewManager();
  const history = useHistory();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [tooltipExtra, recruitToCrew, clickWarning] = useMemo(() => {
    let tip = '';
    let ontoCrew = 0;
    let warning = '';

    // if active crew is stationed here...
    if (crew?._location?.buildingId === lot?.building?.id) {
      // ... and if crew has space, add to crew
      if (crew.Crew?.roster?.length < 5) {
        ontoCrew = crew.id;

      // ... else if crew is full, start new crew (with alert warning)
      } else {
        tip += ` (Start New Crew)`;
        warning = `Because your active crew's roster is full, this crewmate will be recruited to a new crew.`;
      }

    // else if no crew or crew is stationed elsewhere, will start a new crew (only warn for latter)
    } else {
      tip += ` (Start New Crew)`;
      if (crew) {
        warning = 'Because your active crew is stationed elsewhere, this crewmate will be recruited to a new crew.';
      }
    }

    return [tip, ontoCrew, warning];
  }, [crew, lot]);


  const handleClick = useCallback(() => {
    if (clickWarning) {
      createAlert({
        type: 'GenericAlert',
        data: { content: clickWarning },
        duration: 6000
      });
    }
    history.push(`/recruit/${recruitToCrew || 0}/${lot?.building?.id}`)
  }, [recruitToCrew, clickWarning, lot?.building?.id]);

  const pendingCrewmate = useMemo(getPendingCrewmate, [getPendingCrewmate]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (pendingCrewmate) return 'recruiting...';
    // if recruiting to new crew, there is no crew to check permissions on, so just check if public
    if (recruitToCrew === 0) {
      const policy = Permission.getPolicyDetails(lot?.building)[Permission.IDS.RECRUIT_CREWMATE];
      if (policy.policyType === Permission.POLICY_IDS.PUBLIC) return '';
    }
    // else, check for crew permission
    return getCrewDisabledReason({
      asteroid,
      crew,
      permission: Permission.IDS.RECRUIT_CREWMATE,
      permissionTarget: lot?.building,
      requireLaunched: false
    });
  }, [asteroid, crew, lot?.building, pendingCrewmate, recruitToCrew]);

  // TODO: attention always?
  return (
    <ActionButton
      label={`Recruit Crewmate${tooltipExtra}`}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        attention: reactBool(!pendingCrewmate && !(crew?.Crew?.roster?.length > 0)),
        loading: reactBool(!!pendingCrewmate),
      }}
      icon={<RecruitCrewmateIcon />}
      onClick={handleClick} />
  );
};

export default { Component: RecruitCrewmate, isVisible };
