import { useCallback, useEffect, useState } from 'react';
import { Capable } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const fieldName = 'type';

const initialValues = Object.keys(Capable.TYPES).reduce((acc, k) => ({ ...acc, [k]: true }), {});

const BuildingTypeFilter = ({ filters, onChange }) => {
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
      assetType="buildings"
      collapsed={!filters[fieldName]}
      fieldName={fieldName}
      title="Type">
      
      {Object.keys(Capable.TYPES).map((k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{Capable.TYPES[k].name}</span>
        </CheckboxRow>
      ))}
    </SearchMenu>
  );
};

export default BuildingTypeFilter;
