import { useCallback, useMemo, useRef } from '~/lib/react-debug';
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
  const lotIndex = useRef();
  const maxLots = useMemo(import.meta.url, () => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);

  const handleById = useCallback(import.meta.url, () => {
    if (lotIndex.current.value) {
      let targetIndex = parseInt(lotIndex.current.value);

      if (targetIndex <= 0) {
        lotIndex.current.value = 1;
        targetIndex = 1;
      }

      if (targetIndex > maxLots) {
        lotIndex.current.value = maxLots;
        targetIndex = maxLots;
      }

      dispatchLotSelected(Lot.toId(asteroidId, targetIndex));
    }
  }, [asteroidId, dispatchLotSelected, maxLots]);

  const handleKeydown = useCallback(import.meta.url, (e) => {
    if (['Enter', 'Tab'].includes(e.key)) {
      handleById();
    }
  }, [handleById]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title="Lot #">

      <InputBlock>
        <div>
          <UncontrolledTextInput
            ref={lotIndex}
            onKeyDown={handleKeydown}
            placeholder="Lot #"
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
