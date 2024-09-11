import { useCallback, useEffect, useMemo, useRef, useState } from '~/lib/react-debug';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import styled from 'styled-components';
import Button from './ButtonAlt';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';
import { nativeBool } from '~/lib/utils';

const Wrapper = styled.div`
  position: relative;
`;

const Caret = styled.span`
  font-size: 80%;
`;

const IconWrapper = styled.span`
  display: inline-block;
  font-size: 120%;
  line-height: 0;
  margin-right: 4px;
`;

const Options = styled.div`
  background: #111;
  max-height: 50vh;
  min-width: ${p => p.width ? `${p.width}px` : 'auto'};
  overflow: auto;
  position: absolute;
  ${p => p.dropUp && `
    bottom: 32px;
  `}
`;
const Option = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  padding: 8px;
  transition: background-color 200ms ease;
  white-space: nowrap;
  width: 100%;
  &:hover {
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  }
`;

const SelectedLabel = styled.label`
  flex: 1;
  text-align: left;
`;

// options can be array of strings or array of objects
const Multiselect = ({
  disabled,
  enabledKeys = [],
  buttonIcon,
  buttonLabel,
  labelKey = 'label',
  onChange,
  options: rawOptions,
  valueKey = 'key',
  ...styleProps
}) => {
  const [isObjArr, options] = useMemo(import.meta.url, () => {
    if (typeof (rawOptions || [])[0] === 'object') {
      return [true, [...rawOptions]];
    }
    return [false, rawOptions.map((o, i) => ({ [labelKey]: o, [valueKey]: i }))];
  }, [rawOptions]);

  const closeTimer = useRef();

  const [open, setOpen] = useState(false);
  const [popperEl, setPopperEl] = useState();
  const [referenceEl, setReferenceEl] = useState();

  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });

  const handleToggle = useCallback(import.meta.url, () => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);

  const handleMouseEnter = useCallback(import.meta.url, () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
  }, []);

  const handleMouseLeave = useCallback(import.meta.url, () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
    }, 500);
  }, []);
  useEffect(import.meta.url, () => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    }
  }, []);
  
  useEffect(import.meta.url, () => {
    setOpen(false);
  }, [disabled]);

  return (
    <Wrapper
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>

      <span ref={setReferenceEl}>
        <Button
          disabled={nativeBool(disabled)}
          onClick={handleToggle}
          {...styleProps}>
          {buttonIcon && <IconWrapper>{buttonIcon}</IconWrapper>}
          <SelectedLabel>{buttonLabel}</SelectedLabel>
          <Caret>▾</Caret>
        </Button>
      </span>

      {open && createPortal(
        <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000 }} {...attributes.popper}>
          <Options {...styleProps}>
            {options.map((o) => (
              <Option key={o[valueKey]} onClick={onChange(isObjArr ? o : o[valueKey])}>
                <IconWrapper>
                  {enabledKeys.includes(o[valueKey]) ? <CheckedIcon /> : <UncheckedIcon />}
                </IconWrapper>
                <label>{o[labelKey]}</label>
              </Option>
            ))}
          </Options>
        </div>,
        document.body
      )}
    </Wrapper>
  );
};

export default Multiselect;