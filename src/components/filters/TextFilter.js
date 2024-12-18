import { useCallback, useMemo } from 'react';

import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';

const TextFilter = ({ assetType, fieldName, filters, isId, onChange, placeholder, title }) => {  
  const handleChange = useCallback((e) => {
    onChange({ [fieldName]: e.currentTarget.value });
  }, [onChange]);

  const extraProps = useMemo(() => isId ? { step: 1, min: 1, type: "number" } : {}, [isId]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title={title}>
      
      <InputBlock singleField>
        <div>
          <UncontrolledTextInput
            onChange={handleChange}
            placeholder={placeholder || `Filter by ${title}...`}
            value={filters[fieldName] || ''}
            {...extraProps} />
        </div>
      </InputBlock>

    </SearchMenu>
  );
};

export default TextFilter;
