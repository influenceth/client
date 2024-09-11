import { useState } from '~/lib/react-debug';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: 0px;
  border-bottom: 1px solid ${p => p.theme.colors.main};
  color: ${p => p.theme.colors.mainText};
  font-family: 'Jura', sans-serif;
  font-size: ${p => p.theme.fontSizes.mainText};
  text-align: right;
  height: 25px;
  padding: 0 10px 0 5px;
  width: 100px;

  &:focus {
    outline: none;
  }

  &:invalid {
    border-color: ${props => props.theme.colors.error};
  }
`;

const NumberInput = (props) => {
  const { initialValue, onChange, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue === undefined ? 0 : initialValue);

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
