import { useCallback, useEffect, useState } from '~/lib/react-debug';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import { RadioCheckedIcon, RadioUncheckedIcon } from '~/components/Icons';
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

  useEffect(import.meta.url, () => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] && filters[fieldName].length > 0) {
      const filterArr = filters[fieldName];
      Object.keys(newTypes).forEach((k) => {
        newTypes[k] = filterArr.includes(k);
      });
    }
    setTypes(newTypes);
  }, [filters[fieldName]]);

  const onClick = useCallback(import.meta.url, (k) => (e) => {
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
            {types[k] ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
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
