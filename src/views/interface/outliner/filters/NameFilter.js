import { useEffect, useState } from 'react';
import styled from 'styled-components';

import TextInput from '~/components/TextInput';

const StyledTitle = styled.h3`
  margin-bottom: 10px !important;
`;

const NameFilter = (props) => {
  const { onChange } = props;
  const [ value, setValue ] = useState('');

  useEffect(() => {
    if (onChange) onChange({ name: value });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ value ]);

  return (
    <>
      <StyledTitle>Name</StyledTitle>
      <TextInput
        onChange={(v) => setValue(v)}
        placeholder="Asteroid name..." />
    </>
  );
};

export default NameFilter;
