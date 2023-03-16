import { useCallback } from 'react';

import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';

const fieldName = 'crew';

const CrewmateCrewFilter = ({ filters, onChange }) => {  
  const handleChange = useCallback((e) => {
    onChange({ [fieldName]: e.currentTarget.value });
  }, [onChange]);

  return (
    <SearchMenu
      assetType="crewmates"
      collapsed={!filters[fieldName]}
      fieldName={fieldName}
      title="Crew">
      
      <InputBlock singleField>
        {/* <label>Crew Id</label>*/}
        <div>
          <UncontrolledTextInput
            onChange={handleChange}
            placeholder="Filter by Crew Id..."
            step={1}
            min={1}
            type="number"
            value={filters[fieldName] || ''} />
        </div>
      </InputBlock>

    </SearchMenu>
  );
};

export default CrewmateCrewFilter;
