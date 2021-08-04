import { useState } from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${props => props.theme.colors.main};
  color: ${props => props.theme.colors.mainText};
  font-size: ${props => props.theme.fontSizes.mainText};
  text-align: right;
  height: 28px;
  padding: 0 10px 0 5px;

  &:focus {
    outline: none;
  }
`;

const NumberInput = (props) => {
  const { initialValue, onChange, format, parse, ...restProps } = props;
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
