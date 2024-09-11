import { useCallback, useEffect, useState } from '~/lib/react-debug';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const BooleanFilter = ({ assetType, filters, onChange, title, label, fieldName, initialValue }) => {
  const [ value, setValue ] = useState(!!initialValue);

  useEffect(import.meta.url, () => {
    if (filters[fieldName] !== undefined) {
      setValue(filters[fieldName]);
    } else {
      setValue(initialValue);
    }
  }, [filters[fieldName], initialValue]);

  const onClick = useCallback(import.meta.url, (e) => {
    onChange({ [fieldName]: !value });
  }, [fieldName, onChange, value]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title={title}>
      <CheckboxRow onClick={onClick}>
        <CheckboxButton checked={value}>
          {value ? <CheckedIcon /> : <UncheckedIcon />}
        </CheckboxButton>
        <span>{label}</span>
      </CheckboxRow>
    </SearchMenu>
  );
};

export default BooleanFilter;
