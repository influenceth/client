import { forwardRef, useEffect, useRef, useState } from '~/lib/react-debug';
import styled from 'styled-components';

const StyledInput = styled.input`
  background-color: transparent;
  border: solid ${p => p.theme.colors.main};
  border-width: 0px 0px 1px;
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

const TextInput = forwardRef((props, forwardedRef) => {
  const { initialValue, onChange, resetOnChange, ...restProps } = props;
  const [ value, setValue ] = useState(initialValue || '');

  const localRef = useRef();
  const ref = forwardedRef || localRef;

  const _onChange = (e) => {
    setValue(e.target.value);
    if (onChange) onChange(e.target.value);

    // TODO (bug): below does not seem to use pattern (should probably be an OR with maxlength also)
    // pattern takes precedence over maxlength, so this will apply maxlength
    // explicitly if both properties are set
    if (ref.current && props.pattern && props.maxlength) {
      if ((e.target.value || '').length > props.maxlength) {
        ref.current.setCustomValidity('Too long.');
      } else {
        ref.current.setCustomValidity('');
      }
    }
  };

  useEffect(import.meta.url, () => {
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
