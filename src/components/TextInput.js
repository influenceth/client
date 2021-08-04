import { useState } from 'react';
import styled from 'styled-components';

const StyledTextInput = styled.div`
  flex: 0 1 auto;
`;

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${props => props.theme.colors.main};
  color: ${props => props.theme.colors.mainText};
  font-size: ${props => props.theme.fontSizes.mainText};
  text-align: ${props => props.format === 'numeric' ? 'right' : 'left'};
  height: 28px;
  padding: 0 5px;

  &:focus {
    outline: none;
  }
`;

const TextInput = (props) => {
  const { placeholder, initialValue, onChange, format, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue || '');

  const _onChange = (e) => {
    let parsed = e.target.value;
    if (format === 'numeric') parsed = Number(parsed.replace(/[\D.]*/g,''));
    setValue(parsed);
    if (onChange) onChange(parsed);
  };

  return (
    <StyledTextInput {...restProps}>
      <StyledInput
        type="text"
        format={format || 'text'}
        value={Number(value).toLocaleString()}
        onChange={_onChange}
        placeholder={placeholder ? placeholder : ''}
        spellCheck="false" />
    </StyledTextInput>
  );
};

export default TextInput;
