import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  MdRadioButtonChecked as CheckedIcon,
  MdRadioButtonUnchecked as UncheckedIcon,
} from 'react-icons/md';
import { Address } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import ColorPicker from '~/components/ColorPicker';
import TextInput from '~/components/TextInputUncontrolled';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';
import useCrewContext from '~/hooks/useCrewContext';

const options = {
  me: "Occupied by Me",
  other: "Occupied by Someone Else",
  // unoccupied: "Occupied by Nobody",
};

const initialValues = {
  me: null,
  other: null,
  // unoccupied: null
};

const defaultColorMap = {
  me: '#FDA1FF',
  other: '#68CCCA',
  // unoccupied: '#666666',
}

const fieldName = 'occupiedBy';
const highlightFieldName = 'occupiedBy';

const LotOccupiedFilter = ({ assetType, filters, onChange }) => {
  const { crew } = useCrewContext();
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [types, setTypes] = useState(initialValues);
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
    onChange({ [fieldName]: k });
  }, [onChange]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      highlightFieldName={highlightFieldName}
      title="Occupation"
      highlightColorMap={highlightColors}>
      {Object.keys(options).map((k) => (!crew && k === 'me') ? null : (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{options[k]}</span>
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

export default LotOccupiedFilter;
