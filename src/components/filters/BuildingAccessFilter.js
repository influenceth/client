import { useCallback, useEffect, useRef, useState } from 'react';
import { Address } from '@influenceth/sdk';

import { RadioCheckedIcon, RadioUncheckedIcon } from '~/components/Icons';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';
import useCrewContext from '~/hooks/useCrewContext';

const options = {
  all: "All",
  granted: "Public / Permitted",
  public: "Public",
  leaseable: "Leaseable",
};

const initialValues = {
  all: true,
  granted: null,
  public: null,
  leaseable: null
};

const fieldName = 'access';

const BuildingAccessFilter = ({ assetType, filters, onChange }) => {
  const { crew } = useCrewContext();

  const [types, setTypes] = useState(initialValues);
  console.log({ 'types': types });

  useEffect(() => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] && filters[fieldName].length > 0) {
      const filterArr = filters[fieldName];
      Object.keys(newTypes).forEach((k) => {
        if (k === 'granted') {
          if (Array.isArray(filterArr) && filterArr.includes(crew?.id) && filterArr.includes(crew?.Crew?.delegatedTo)) {
            newTypes[k] = true;
          }
        } else {
          newTypes[k] = filterArr.includes(k);
        }
      });
    }
    setTypes(newTypes);
  }, [filters[fieldName]]);

  const onClick = useCallback((k) => (e) => {
    e.stopPropagation();
    if (k === 'granted') {
      onChange({ [fieldName]: [crew?.id, crew?.Crew?.delegatedTo] });
    } else {
      onChange({ [fieldName]: k });
    }
  }, [onChange]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title="Access">
      {Object.keys(options)
        .filter((k) => !((crew && k === 'public') || (!crew && k === 'granted')))
        .map((k) => (
          <CheckboxRow key={k} onClick={onClick(k)}>
            <CheckboxButton checked={types[k]}>
              {types[k] || (Array.isArray(types[k]) && k === 'granted') ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
            </CheckboxButton>
            <span>{options[k]}</span>
          </CheckboxRow>
        ))
      }
    </SearchMenu>
  );
};

export default BuildingAccessFilter;