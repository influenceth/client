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

const NameFilter = ({ filters, onChange }) => {  
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

  return (
    <SearchMenu
      assetType="asteroids"
      fieldName={fieldName}
      filters={filters}
      onChange={onChange}
      title="Name & Id">
      
      <InputBlock>
        <label>Asteroid Name</label>
        <div>
          <UncontrolledTextInput
            onChange={handleChange}
            placeholder="Filter by Asteroid Name..."
            value={filters[fieldName] || ''} />
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Asteroid Id</label>
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

export default NameFilter;
