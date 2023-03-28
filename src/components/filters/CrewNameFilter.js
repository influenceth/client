import { useCallback } from 'react';

import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';

const fieldName = 'name';

const CrewNameFilter = ({ assetType, filters, onChange }) => {  
  const handleChange = useCallback((e) => {
    onChange({ [fieldName]: e.currentTarget.value });
  }, [onChange]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      onChange={onChange}
      title="Name">
      
      <InputBlock singleField>
        {/* <label>Crewmate Name</label>*/}
        <div>
          <UncontrolledTextInput
            onChange={handleChange}
            placeholder="Filter by Name..."
            value={filters[fieldName] || ''} />
        </div>
      </InputBlock>

    </SearchMenu>
  );
};

export default CrewNameFilter;
