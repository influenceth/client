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

const options = {
  unowned: "Unowned",
  owned: "Owned (by Anyone)",
  ownedByMe: "Owned by Me",
  ownedBy: "Owned by Address",
};

const initialValues = {
  owned: null,
  unowned: null,
  ownedByMe: null,
  ownedBy: null
};

const defaultColorMap = {
  owned: '#6efaf4',
  unowned: '#00c7ff',
  ownedByMe: '#ffffff',
  ownedBy: '#ff00f2'
}

const fieldName = 'ownedBy';
const highlightFieldName = 'ownership';

const OwnershipFilter = ({ filters, onChange }) => {
  const { account } = useAuth();
  const highlight = useStore(s => s.asteroids.highlight) || {};
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [types, setTypes] = useState(initialValues);
  const [ownedByAddress, setOwnedByAddress] =  useState('');
  const [highlightColors, setHighlightColors] = useState({ ...(fieldHighlight?.colorMap || defaultColorMap) });

  const addressInput = useRef(); 

  useEffect(() => {
    const newTypes = { ...initialValues };
    if (filters[fieldName]) {
      const standardAddress = Address.toStandard(filters[fieldName]) || '';
      if (standardAddress) {
        if (Address.areEqual(filters[fieldName], account)) {
          newTypes.ownedByMe = true;
        } else {
          newTypes.ownedBy = standardAddress;
          setOwnedByAddress(standardAddress);
        }
      } else {
        newTypes[filters[fieldName]] = true;
      }
    }
    setTypes(newTypes);
    
  }, [filters[fieldName]]);

  const onClick = useCallback((k) => (e) => {
    e.stopPropagation();
    let value = k;
    if (k === 'ownedByMe' && account && Address.toStandard(account)) {
      value = Address.toStandard(account);
    } else if (k === 'ownedBy') {
      if (ownedByAddress && Address.toStandard(ownedByAddress)) {
        value = Address.toStandard(ownedByAddress);

        // if ownedByAddress is currently my address, could appear "stuck" on owned by me,
        // so clear the ownedByAddress if it's me when I click ownedBy
        if (Address.areEqual(account, ownedByAddress)) {
          value = 'ownedBy';
          setOwnedByAddress('');
        }
      }

      // when click "owned by address", focus on field
      if (addressInput.current) addressInput.current.focus();
    }
    onChange({ [fieldName]: value });
  }, [account, onChange, ownedByAddress]);

  const handleEvent = useCallback((e) => {
    if (e.type === 'blur' || e.key === 'Enter' || e.key === 'Tab') {
      let validatedValue = e.currentTarget.value && e.currentTarget.value !== '0' && Address.toStandard(e.currentTarget.value);
      if (validatedValue) {
        e.currentTarget.value = validatedValue;
      } else {
        e.currentTarget.value = '';
      }
      e.currentTarget.blur();

      setOwnedByAddress(e.currentTarget.value);
      if (types.ownedBy) {
        onChange({ [fieldName]: validatedValue || 'ownedBy' });
      }
    }
  }, [onChange, types]);

  useEffect(() => {
    if (addressInput.current) addressInput.current.value = ownedByAddress;
  }, [ownedByAddress]);

  const highlightMetadata = useMemo(() => ({ myAddress: account, address: ownedByAddress }), [account, ownedByAddress]);

  return (
    <SearchMenu
      collapsed={!filters[fieldName]}
      fieldName={fieldName}
      highlightFieldName={highlightFieldName}
      highlightMetadata={highlightMetadata}
      title="Owner"
      highlightColorMap={highlightColors}>
      {Object.keys(options).map((k) => (!account && k === 'ownedByMe') ? null : (
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

      <TextInput
        ref={addressInput}
        initialValue={types.ownedBy || ''}
        onBlur={handleEvent}
        onFocus={(e) => e.target.select()}
        onKeyDown={handleEvent}
        placeholder="Wallet Address"
        style={{ marginTop: 4, marginLeft: 24, opacity: types.ownedBy ? 1 : 0.3, width: 'calc(100% - 24px)' }} />
    </SearchMenu>
  );
};

export default OwnershipFilter;
