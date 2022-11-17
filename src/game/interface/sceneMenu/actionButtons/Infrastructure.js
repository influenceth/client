import { useMemo } from 'react';

import { CancelBlueprintIcon, DeconstructIcon, LayBlueprintIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Infrastructure = ({ plot, onSetAction }) => {
  const { label, flags, handleClick, Icon } = useMemo(() => {
    if (plot.building) {
      return {
        label: 'Deconstruct Building',
        Icon: DeconstructIcon,
        flags: {},
        handleClick: () => {
          onSetAction('DECONSTRUCT');
        }
      };
    } else if (plot.blueprint) {
      return {
        label: 'Cancel Blueprint',
        Icon: CancelBlueprintIcon,
        flags: {},
        handleClick: () => {
          onSetAction('CANCEL_BLUEPRINT');
        }
      };
    }
    return {
      label: 'Lay Blueprint',
      Icon: LayBlueprintIcon,
      flags: {},
      handleClick: () => {
        onSetAction('BLUEPRINT');
      }
    };
  }, [plot]);

  return (
    <ActionButton
      label={label}
      flags={flags}
      icon={<Icon />}
      onClick={handleClick} />
  );
};

export default Infrastructure;