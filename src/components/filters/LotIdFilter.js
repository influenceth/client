import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { trim } from 'lodash';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import ColorPicker from '~/components/ColorPicker';
import Ether from '~/components/Ether';
import formatters from '~/lib/formatters';
import constants from '~/lib/constants';
import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

import IconButton from '~/components/IconButton';
import { GoIcon } from '~/components/Icons';

const fieldName = 'name';

const LotIdFilter = ({ assetType, filters, onChange }) => {  
  const asteroidId = useRef();

  const selectAsteroidId = useStore((s) => s.dispatchOriginSelected);

  const handleChange = useCallback((e) => {
    onChange({ [fieldName]: e.currentTarget.value });
  }, [onChange]);

  const handleById = useCallback(() => {
    if (asteroidId.current.value) {
      selectAsteroidId(asteroidId.current.value);
    }
  }, []);

  const handleKeydown = useCallback((e) => {
    if (['Enter', 'Tab'].includes(e.key)) {
      handleById();
    }
  }, [handleById]);


// TODO: include by id:
  /*
    const dispatchLotSelected = useStore(s => s.dispatchLotSelected);

    const handleLotJumper = useCallback((e) => {
      if (e.key === 'Enter' && e.currentTarget.value) {
        dispatchLotSelected(asteroid?.i, parseInt(e.currentTarget.value));
      }
    }, [asteroid?.i]);

    const lotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);
    
    <label>Jump to Lot #</label>
    <NumberInput
      initialValue={null}
      max={lotTally}
      min={1}
      step={1}
      onBlur={(e) => e.currentTarget.value = undefined}
      onKeyDown={handleLotJumper} />
  */

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      onChange={onChange}
      title="Lot Id">
      
      <InputBlock>
        <label>Lot Id</label>
        <div>
          <UncontrolledTextInput
            ref={asteroidId}
            onBlur={(e) => e.currentTarget.value = ''}
            onKeyDown={handleKeydown}
            placeholder="Pick by Asteroid Id..."
            step={1}
            max={250000}
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
