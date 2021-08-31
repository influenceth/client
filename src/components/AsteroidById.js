import { useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import NumberInput from '~/components/NumberInput';
import IconButton from '~/components/IconButton';
import { GoIcon } from '~/components/Icons';

const StyledAsteroidById = styled.form`
  display: flex;
  flex: 1 1 0;
  margin-top: 10px;

  & input {
    flex: 1 1 0;
    text-align: left;
    width: auto;
  }

  & button {
    margin-left: 10px;
  }
`;

const AsteroidById = (props) => {
  const { targetAsteroid, ...restProps } = props;
  const [ value, setValue ] = useState('');
  const pickAsteroid = useStore(s => {
    return targetAsteroid === 'destination' ? s.dispatchDestinationSelected : s.dispatchOriginSelected;
  });

  return (
    <StyledAsteroidById onSubmit={(e) => e.preventDefault()} {...restProps}>
      <NumberInput
        onChange={(v) => setValue(v)}
        initialValue={''}
        min={1}
        max={250000}
        placeholder="Pick by Asteroid Id..." />
      <IconButton
        data-tip="Select asteroid"
        data-for="global"
        onClick={() => pickAsteroid(value)}>
        <GoIcon />
      </IconButton>
    </StyledAsteroidById>
  );
};

export default AsteroidById;
