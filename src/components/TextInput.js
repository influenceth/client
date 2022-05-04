import { forwardRef, useEffect, useState } from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${p => p.theme.colors.main};
  color: ${p => p.theme.colors.mainText};
  font-family: 'Jura', sans-serif;
  font-size: ${p => p.theme.fontSizes.mainText};
  text-align: ${p => p.format === 'numeric' ? 'right' : 'left'};
  height: 28px;
  padding: 0 5px;

  &:focus {
    outline: none;
  }

  &:invalid {
    border-bottom: 1px solid ${props => props.theme.colors.error};
  }
`;

const TextInput = forwardRef((props, ref) => {
  const { initialValue, onChange, resetOnChange, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue || '');

  const _onChange = (e) => {
    setValue(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  useEffect(() => {
    _onChange({ target: { value: initialValue || '' } });
  }, [resetOnChange]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StyledInput
      ref={ref}
      type="text"
      value={value}
      onChange={_onChange}
      {...restProps} />
  );
});

export default TextInput;
