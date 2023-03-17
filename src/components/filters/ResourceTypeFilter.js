import { useCallback, useEffect, useState } from 'react';
import { Inventory } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const fieldName = 'resource';

const initialValues = Object.keys(Inventory.RESOURCES).reduce((acc, k) => ({ ...acc, [k]: true }), {});

const ResourceTypeFilter = ({ filters, onChange }) => {
  const [ types, setTypes ] = useState({ ...initialValues });

  useEffect(() => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] && filters[fieldName].length > 0) {
      const filterArr = filters[fieldName].split(',');
      Object.keys(newTypes).forEach((k) => {
        newTypes[k] = filterArr.includes(k);
      });
    }
    setTypes(newTypes);
  }, [filters[fieldName]]);

  const onClick = useCallback((k) => (e) => {
    e.stopPropagation();
    const newTypes = {
      ...types,
      [k]: !types[k]
    }
    onChange({ [fieldName]: Object.keys(newTypes).filter((k) => newTypes[k]).join(',') });
  }, [onChange, types]);

  return (
    <SearchMenu
      assetType="coresamples"
      collapsed={!filters[fieldName]}
      fieldName={fieldName}
      title="Resource Type">
      
      {Object.keys(Inventory.RESOURCES).map((k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{Inventory.RESOURCES[k].name}</span>
        </CheckboxRow>
      ))}
    </SearchMenu>
  );
};

export default ResourceTypeFilter;
