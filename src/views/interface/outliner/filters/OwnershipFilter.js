import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import TextInput from '~/components/TextInput';
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';

const field = 'ownership';
const initialValues = {
  owned: true,
  unowned: true,
  ownedBy: null
};

const StyledTitle = styled.h3`
  margin-bottom: 10px !important;
`;

const OwnershipType = styled.div`
  align-items: center;
  display: flex;
`;

const OwnershipFilter = (props) => {
  const { onChange } = props;
  const { account } = useWeb3React();
  const highlight = useStore(state => state.asteroids.highlight);
  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);

  const [ highlightActive, setHighlightActive ] = useState(false);
  const [ types, setTypes ] = useState(initialValues);
  const [ ownedBy, setOwnedBy ] = useState(account);
  const [ colors, setColors ] = useState({
    owned: '#6efaf4',
    unowned: '#00c7ff',
    ownedBy: '#ff00f2'
  });

  const handleHighlightToggle = () => {
    if (highlightActive) {
      updateHighlight(null);
    } else {
      updateHighlight({ field: field, colorMap: colors });
    }
  };

  const toggleUnowned = () => setTypes(Object.assign({}, types, { unowned: !types.unowned }));
  const toggleOwned = () => setTypes(Object.assign({}, types, { owned: !types.owned }));
  const updateOwnedBy = (v) => {
    setOwnedBy(v);
    if (types.ownedBy) setTypes(Object.assign({}, types, { ownedBy: v }));
  };

  const ownedByOn = () => setTypes(Object.assign({}, types, { ownedBy: ownedBy }));
  const ownedByOff = () => {
    const { ownedBy, ...newTypes } = types;
    setTypes(newTypes);
  };

  useEffect(() => {
    if (onChange) {
      const returnValues = [];
      if (types.owned) returnValues.push('owned');
      if (types.unowned) returnValues.push('unowned');
      if (types.ownedBy) returnValues.push(types.ownedBy);
      onChange({ ownedBy: returnValues.join(',') });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ types ]);

  useEffect(() => {
    setHighlightActive(highlight?.field === field);
  }, [ highlight ]);

  useEffect(() => {
    if (highlightActive) updateHighlight({ field: field, colorMap: colors });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, colors ]);

  useEffect(() => {
    return () => highlightActive && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StyledTitle>Ownership</StyledTitle>
      <Highlighter
        active={highlightActive}
        onClick={handleHighlightToggle} />
      <OwnershipType>
        <IconButton
          onClick={toggleUnowned}
          borderless>
          {types.unowned ? <CheckedIcon /> : <UncheckedIcon />}
        </IconButton>
        <span>Un-owned</span>
        {highlightActive && (
          <ColorPicker initialColor={colors.unowned} onChange={(c) => {
            setColors(Object.assign({}, colors, { unowned: c }));
          }} />
        )}
      </OwnershipType>
      <OwnershipType>
        <IconButton
          onClick={toggleOwned}
          borderless>
          {types.owned ? <CheckedIcon /> : <UncheckedIcon />}
        </IconButton>
        <span>Owned</span>
        {highlightActive && (
          <ColorPicker initialColor={colors.owned} onChange={(c) => {
            setColors(Object.assign({}, colors, { owned: c }));
          }} />
        )}
      </OwnershipType>
      <OwnershipType>
        <IconButton
          onClick={() => types.ownedBy ? ownedByOff() : ownedByOn()}
          borderless>
          {types.ownedBy ? <CheckedIcon /> : <UncheckedIcon />}
        </IconButton>
        <span>Owned by:</span>
        <TextInput initialValue={account || ''} onChange={updateOwnedBy} />
        {highlightActive && (
          <ColorPicker initialColor={colors.ownedBy} onChange={(c) => {
            setColors(Object.assign({}, colors, { ownedBy: c }));
          }} />
        )}
      </OwnershipType>
    </>
  );
};

export default OwnershipFilter;
