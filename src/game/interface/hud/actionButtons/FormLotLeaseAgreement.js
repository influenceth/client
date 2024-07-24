import { useCallback, useMemo, useState } from 'react';

import { FormLotAgreementIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { Permission } from '@influenceth/sdk';
import Coachmarks, { COACHMARK_IDS } from '~/Coachmarks';

// TODO: arguably, it would be more consistent to show this button in a disabled state, at least in some conditions
const isVisible = ({ lot, crew }) => {
  // visible when lot selected and lot is available to crew (and uncontrolled or not controlled by occupant)
  if (lot && Permission.getPolicyDetails(lot, crew?.id)[Permission.IDS.USE_LOT]?.crewStatus === 'available') {
    if (!lot.Control?.controller?.id) return true;
    if ((lot.building || lot.surfaceShip)?.Control?.controller?.id !== lot.Control.controller.id) return true;
  }
  return false;
};

const FormLotLeaseAgreement = ({ lot, permission, welcomeTour, _disabled }) => {
  const { pendingChange } = useAgreementManager(lot, permission);
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('FORM_AGREEMENT', { entity: lot, permission: Permission.IDS.USE_LOT });
  }, [lot, permission]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    if (welcomeTour) {
      if (lot?.building || lot?.surfaceShip) return 'occupied by another crew';
      if (welcomeTour.leasedLots?.length >= 5) return 'max simulation lots already leased';
    }
    return '';
  }, [_disabled, pendingChange]);

  const [refEl, setRefEl] = useState();
  return (
    <>
      <ActionButton
        ref={setRefEl}
        label="Form Lot Agreement"
        labelAddendum={disabledReason}
        flags={{
          attention: welcomeTour && !(_disabled || disabledReason),
          disabled: _disabled || disabledReason,
          loading: pendingChange
        }}
        icon={<FormLotAgreementIcon />}
        onClick={handleClick} />
      <Coachmarks label={COACHMARK_IDS.actionButtonLease} refEl={refEl} />
    </>
  );
};

export default { Component: FormLotLeaseAgreement, isVisible };