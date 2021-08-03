import { useEffect, useState } from 'react';
import styled from 'styled-components';

const StyledTextInput = styled.div`
`;

const StyledInput = styled.input`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.main};
  color: ${props => props.theme.colors.mainText};
  font-size: ${props => props.theme.fontSizes.mainText};
  height: 28px;
  padding: 0 5px;
  width: 140px;

  &:focus {
    outline: none;
  }
`;

const TextInput = (props) => {
  const { placeholder } = props;
  const [ value, setValue ] = useState('');

  return (
    <StyledTextInput {...props}>
      <StyledInput
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ? placeholder : ''}
        spellCheck="false" />
    </StyledTextInput>
  );
};

export default TextInput;
