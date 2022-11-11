import { useMemo } from 'react';

import { CancelBlueprintIcon, DeconstructIcon, LayBlueprintIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Infrastructure = ({ plot }) => {
  const { label, flags, handleClick, Icon } = useMemo(() => {
    if (plot.building) {
      return {
        label: 'Deconstruct Building',
        Icon: DeconstructIcon,
        flags: {},
        handleClick: () => {
          console.log('not yet supported');
        }
      };
    } else if (plot.blueprint) {
      return {
        label: 'Cancel Blueprint',
        Icon: CancelBlueprintIcon,
        flags: {},
        handleClick: () => {
          console.log('not yet supported');
        }
      };
    }
    return {
      label: 'Lay Blueprint',
      Icon: LayBlueprintIcon,
      flags: {},
      handleClick: () => {
        console.log('not yet supported');
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