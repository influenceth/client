import { useCallback } from 'react';

import { SurfaceTransferIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const SurfaceTransfer = ({ onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Surface Transfer'}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransfer;