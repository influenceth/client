import { useCallback, useMemo, useState } from 'react';

import { FormLotAgreementIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { Permission } from '@influenceth/sdk';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';

// TODO: arguably, it would be more consistent to show this button in a disabled state, at least in some conditions
const isVisible = ({ lot, blockTime, crew }) => {
  // visible when lot selected and lot is available to crew (and uncontrolled or not controlled by occupant)
  if (lot && Permission.getPolicyDetails(lot, crew, blockTime)[Permission.IDS.USE_LOT]?.crewStatus === 'available') {
    if (!lot.Control?.controller?.id) return true;
    if ((lot.building || lot.surfaceShip)?.Control?.controller?.id !== lot.Control.controller.id) return true;
  }
  return false;
};

const FormLotLeaseAgreement = ({ lot, permission, simulation, simulationActions, _disabled }) => {
  const { pendingChange } = useAgreementManager(lot, permission);
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

  return (
    <ActionButton
      ref={setCoachmarkRef(COACHMARK_IDS.actionButtonLease)}
      label="Form Lot Agreement"
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