import { useCallback } from 'react';

import { HexagonIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Refine = ({ asteroid, crew, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    // onSetAction('BUILD_SHIP');
    onSetAction('REFINE');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Refine"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? crew already on ship? ship ownership?
        loading: false, // TODO: ...
      }}
      icon={<HexagonIcon />}
      onClick={handleClick} />
  );
};

export default Refine;