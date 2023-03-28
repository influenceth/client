import { useCallback, useEffect, useState } from 'react';
import { Crewmate } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const fieldName = 'class';

const initialValues = Object.keys(Crewmate.CLASSES).reduce((acc, k) => ({ ...acc, [k]: true }), {});

const CrewmateClassFilter = ({ assetType, filters, onChange }) => {
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
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      onChange={onChange}
      title="Class">
      
      {Object.keys(Crewmate.CLASSES).map((k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{Crewmate.CLASSES[k].name}</span>
        </CheckboxRow>
      ))}
    </SearchMenu>
  );
};

export default CrewmateClassFilter;
