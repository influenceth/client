import { useState } from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${props => props.theme.colors.main};
  color: ${props => props.theme.colors.mainText};
  font-family: 'Jura', sans-serif;
  font-size: ${props => props.theme.fontSizes.mainText};
  text-align: ${props => props.format === 'numeric' ? 'right' : 'left'};
  height: 28px;
  padding: 0 5px;

  &:focus {
    outline: none;
  }

  &:invalid {
    border-bottom: 1px solid red;
  }
`;

const TextInput = (props) => {
  const { initialValue, onChange, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue || '');

  const _onChange = (e) => {
    setValue(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <StyledInput
      type="text"
      value={value}
      onChange={_onChange}
      {...restProps} />
  );
};

export default TextInput;
