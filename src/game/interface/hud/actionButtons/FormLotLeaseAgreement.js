import { useCallback, useMemo } from 'react';
import { Building, Permission } from '@influenceth/sdk';

import { FormLotAgreementIcon, SwayIcon } from '~/components/Icons';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import theme from '~/theme';
import ActionButton from './ActionButton';

// TODO: arguably, it would be more consistent to show this button in a disabled state, at least in some conditions
const isVisible = ({ lot, blockTime, crew }) => {
  // visible when lot selected and lot is available to crew (and uncontrolled or not controlled by occupant)
  if (lot && Permission.getPolicyDetails(lot, crew, blockTime)[Permission.IDS.USE_LOT]?.crewStatus === 'available') {
    if (!lot.Control?.controller?.id) return true;
    if ((lot.building || lot.surfaceShip)?.Control?.controller?.id !== lot.Control.controller.id) return true;
  }
  return false;
};

const FormLotLeaseAgreement = ({ accountCrewIds, blockTime, lot, permission, simulation, simulationActions, _disabled }) => {
  const { currentPolicy, pendingChange } = useAgreementManager(lot, Permission.IDS.USE_LOT);
  const setCoachmarkRef = useCoachmarkRefSetter();
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('FORM_AGREEMENT', { entity: lot, permission: Permission.IDS.USE_LOT });
  }, [lot, permission]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    if (simulation) {
      if (lot?.building || lot?.surfaceShip) return 'occupied by another crew';
      if (!simulationActions.includes('FormLotLeaseAgreement')) return 'simulation restricted';
    }
    return '';
  }, [_disabled, pendingChange, simulation, simulationActions]);

  const buttonProps = useMemo(() => {
    const leaseRate = formatFixed((currentPolicy?.policyDetails?.rate || 0) * 24);
    
    // if my building is here with expired lease...
    if (accountCrewIds?.includes((lot?.building || lot?.surfaceShip)?.Control?.controller?.id)) {
      return {
        label: `Restore Expired Lease`,
        overrideColor: theme.colors.red
      };
    }

    // if there is a building (not mine), calculate salvage price
    if (lot?.building) {
      const lastAgreementEndTime = lot?.PrepaidAgreements?.sort((a, b) => b.endTime - a.endTime)[0]?.endTime;
      const salvageRightsPrice = Permission.getLotAuctionPrice(lastAgreementEndTime, blockTime);
      return {
        label: (
          <>
            Repossess
            {lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL ? ' Building' : ' Construction Site'}
            {salvageRightsPrice > 0 ? <> (<SwayIcon />{formatFixed(salvageRightsPrice)})</> : null}<br/>
            and Lease Lot (<SwayIcon />{leaseRate} / day)
          </>
        ),
      };
    }

    // else (no building or no expired lease), just lease the lot
    return {
      label: <>Lease Lot (<SwayIcon />{leaseRate} / day)</>,
    };
    
  }, [accountCrewIds, blockTime, currentPolicy, lot]);

  return (
    <ActionButton
      ref={setCoachmarkRef(COACHMARK_IDS.actionButtonLease)}
      {...buttonProps}
      labelAddendum={disabledReason}
      flags={{
        attention: simulation && !disabledReason,
        disabled: _disabled || disabledReason,
        loading: pendingChange
      }}
      icon={<FormLotAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: FormLotLeaseAgreement, isVisible };