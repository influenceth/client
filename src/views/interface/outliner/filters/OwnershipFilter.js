import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import IconButton from '~/components/IconButton';

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
  const { ownedByDefault, onChange } = props;
  if (ownedByDefault) initialValues.ownedBy = ownedByDefault;
  const [ types, setTypes ] = useState(initialValues);

  useEffect(() => {
    if (onChange) {
      const returnValues = [];
      if (types.owned) returnValues.push('owned');
      if (types.unowned) returnValues.push('unowned');
      if (types.ownedBy !== null) returnValues.push(types.ownedBy);
      onChange({ ownedBy: returnValues.join(',') });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ types ]);

  const toggleUnowned = () => setTypes(Object.assign({}, types, { unowned: !types.unowned }));
  const toggleOwned = () => setTypes(Object.assign({}, types, { owned: !types.owned }));
  const updateOwnedBy = (address) => setTypes(Object.assign({}, types, { ownedBy: address }));

  return (
    <>
      <StyledTitle>Ownership</StyledTitle>
      <OwnershipType>
        <IconButton
          onClick={toggleUnowned}
          borderless>
          {types.unowned ? <CheckedIcon /> : <UncheckedIcon />}
        </IconButton>
        <span>Un-owned</span>
      </OwnershipType>
      <OwnershipType>
        <IconButton
          onClick={toggleOwned}
          borderless>
          {types.owned ? <CheckedIcon /> : <UncheckedIcon />}
        </IconButton>
        <span>Owned</span>
      </OwnershipType>
    </>
  );
};

export default OwnershipFilter;
