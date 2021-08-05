import { useState } from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${props => props.theme.colors.main};
  color: ${props => props.theme.colors.mainText};
  font-family: 'Jura', sans-serif;
  font-size: ${props => props.theme.fontSizes.mainText};
  text-align: right;
  height: 25px;
  padding: 0 10px 0 5px;

  &:focus {
    outline: none;
  }
`;

const NumberInput = (props) => {
  const { initialValue, onChange, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue || 0);

  const _onChange = (e) => {
    setValue(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <StyledInput
      type="number"
      value={value}
      onChange={_onChange}
      {...restProps} />
  );
};

export default NumberInput;
