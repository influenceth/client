import { useCallback, useMemo, useRef } from 'react';
import { Asteroid, Lot } from '@influenceth/sdk';

import IconButton from '~/components/IconButton';
import { GoIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';

import { InputBlock, SearchMenu } from './components';

const fieldName = 'id';

const LotIdFilter = ({ assetType, filters }) => {  
  const asteroidId = useStore((s) => s.asteroids.origin);
  const dispatchLotSelected = useStore((s) => s.dispatchLotSelected);
  
  const lotId = useRef();

  const maxLots = useMemo(() => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);

  const handleById = useCallback(() => {
    if (lotId.current.value) {
      let targetId = parseInt(lotId.current.value);
      if (targetId <= 0) {
        lotId.current.value = 1;
        targetId = 1;
      }
      if (targetId > maxLots) {
        lotId.current.value = maxLots;
        targetId = maxLots;
      }
      dispatchLotSelected(Lot.toId(asteroidId, targetId));
    }
  }, [asteroidId]);

  const handleKeydown = useCallback((e) => {
    if (['Enter', 'Tab'].includes(e.key)) {
      handleById();
    }
  }, [handleById]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title="Lot Id">
      
      <InputBlock>
        <div>
          <UncontrolledTextInput
            ref={lotId}
            onBlur={(e) => e.currentTarget.value = ''}
            onKeyDown={handleKeydown}
            placeholder="Lot ID"
            step={1}
            max={maxLots}
            min={1}
            style={{ flex: 1 }}
            type="number" />
          <IconButton
            onClick={handleById}
            style={{ marginLeft: -1, borderRadius: 0, fontSize: 16, marginRight: 0 }}>
            <GoIcon />
          </IconButton>
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default LotIdFilter;
