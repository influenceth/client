import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MdRadioButtonChecked as CheckedIcon,
  MdRadioButtonUnchecked as UncheckedIcon,
} from 'react-icons/md';
import { Address } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import TextInput from '~/components/TextInputUncontrolled';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const options = {
  ownedByMe: "Owned by Me",
  ownedBy: "Owned by Address",
};

const initialValues = {
  ownedByMe: null,
  ownedBy: null
};

const fieldName = 'owner';

const CrewOwnershipFilter = ({ filters, onChange }) => {
  const { account } = useAuth();

  const [types, setTypes] = useState(initialValues);
  const [ownedByAddress, setOwnedByAddress] =  useState('');

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

  return (
    <SearchMenu
      assetType="asteroids"
      collapsed={!filters[fieldName]}
      fieldName={fieldName}
      title="Owner">
      {Object.keys(options).map((k) => (!account && k === 'ownedByMe') ? null : (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{options[k]}</span>
        </CheckboxRow>
      ))}

      <TextInput
        ref={addressInput}
        initialValue={types.ownedBy || ''}
        onBlur={handleEvent}
        onFocus={(e) => e.target.select()}
        onKeyDown={handleEvent}
        placeholder="Wallet Address"
        style={{ marginTop: 4, marginLeft: 24, opacity: types.ownedBy ? 1 : 0.3, width: 'calc(100% - 26px)' }} />
    </SearchMenu>
  );
};

export default CrewOwnershipFilter;
