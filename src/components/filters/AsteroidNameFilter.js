import { useCallback, useRef } from 'react';

import useStore from '~/hooks/useStore';
import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';

import IconButton from '~/components/IconButton';
import { GoIcon } from '~/components/Icons';

const fieldName = 'name';

const NameFilter = ({ assetType, filters, onChange }) => {
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
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title="Name & Id">

      <InputBlock>
        <label>Asteroid Name</label>
        <div>
          <UncontrolledTextInput
            onChange={handleChange}
            placeholder="Filter by Asteroid Name..."
            style={{ width: 'calc(100% - 32px)' }}
            value={filters[fieldName] || ''} />
        </div>
      </InputBlock>

      <InputBlock>
        <label>Asteroid Id</label>
        <div>
          <UncontrolledTextInput
            ref={asteroidId}
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
