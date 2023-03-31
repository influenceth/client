import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capable } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import { CheckboxButton, CheckboxRow, SearchMenu } from './components';
import useStore from '~/hooks/useStore';
import ColorPicker from '../ColorPicker';

const fieldName = 'type';
const highlightFieldName = 'type';

const defaultColorMap = {
  0: '#666666',
  1: '#ff8c00',
  2: '#e81123',
  3: '#ec008c',
  4: '#68217a',
  5: '#00188f',
  6: '#00bcf2',
  7: '#00b294',
  8: '#009e49',
  9: '#bad80a',
  10: '#fff100',
};

const BuildingTypeFilter = ({ assetType, filters, onChange, isLotSearch }) => {
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const displayTypes = useMemo(() => {
    const t = { ...Capable.TYPES };

    if (isLotSearch) {
      t[10] = { name: 'Light Transport (landed)' };
    } else {
      delete t[0];
    }
    return t;
  }, [isLotSearch]);

  const initialValues = useMemo(() => {
    return Object.keys(displayTypes).reduce((acc, k) => ({ ...acc, [k]: true }), {})
  }, [displayTypes]);

  const [ types, setTypes ] = useState({ ...initialValues });
  const [highlightColors, setHighlightColors] = useState({ ...(fieldHighlight?.colorMap || defaultColorMap) });

  useEffect(() => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] && filters[fieldName].length > 0) {
      const filterArr = filters[fieldName];
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
    onChange({ [fieldName]: Object.keys(newTypes).filter((k) => newTypes[k]) });
  }, [onChange, types]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      highlightFieldName={isLotSearch ? highlightFieldName : ''}
      title={isLotSearch ? 'Buildings' : 'Type'}
      highlightColorMap={highlightColors}>
      
      {Object.keys(displayTypes).map((k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{displayTypes[k].name}</span>
          {fieldHighlight && (
            <ColorPicker
              initialColor={highlightColors[k]}
              onChange={(c) => setHighlightColors((h) => ({ ...h, [k]: c }))} />
          )}
        </CheckboxRow>
      ))}
    </SearchMenu>
  );
};

export default BuildingTypeFilter;
