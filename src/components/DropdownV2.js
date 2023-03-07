import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import styled from 'styled-components';
import theme from '~/theme';
import ClipCorner from './ClipCorner';

const cornerSize = 8;

const Wrapper = styled.div`
  position: relative;
`;

const Caret = styled.span`
  font-size: 80%;
`;

const ButtonClipCorner = styled.span`
  opacity: 0.5;
  transition: opacity 250ms ease;
`;

const IconWrapper = styled.span`
  display: inline-block;
  font-size: 120%;
  line-height: 0;
  margin-right: 4px;
`;

const Button = styled.button`
  align-items: center;
  background-color: black;
  border: ${p => p.buttonBorderless ? 'none' : '1px solid'};
  border-color: ${p => p.disabled ? '#444' : `rgba(${p.theme.colors.mainRGB}, 0.5)`};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    0 100%
  );
  color: white;
  cursor: ${p => p.theme.cursors[p.disabled ? 'default' : 'active']};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 105%;
  opacity: ${p => p.disabled ? 0.7 : 1};
  outline: 0;
  overflow: hidden;
  padding: 6px 6px;
  position: relative;
  text-align: left;
  text-overflow: ellipsis;
  transition: border-color 200ms ease;
  white-space: nowrap;
  width: ${p => p.width || 'auto'};
  & > label {
    flex: 1;
  }
  ${Caret} {
    margin-left: 5px;
    ${p => p.buttonBackground && `
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      line-height: 1.44em;
      padding: 0 6px;
    `}
  }
  ${p => p.footnote && `
    &:after {
      content: "${p.footnote}";
      color: ${p.disabled ? '#444' : 'white'};
      font-size: 80%;
      line-height: 145%;
      margin-right: 2px;
    }
  `}

  ${p => !p.disabled && `
    &:hover {
      border-color: ${p.theme.colors.main};
      ${ButtonClipCorner} {
        opacity: 1;
      }
    }
  `}
`;
const Options = styled.div`
  background: #111;
  
  max-height: 50vh;
  min-width: ${p => p.width || 'auto'};
  overflow: auto;
  position: absolute;
  ${p => p.dropUp && `
    bottom: 32px;
  `}
`;
const Option = styled.div`
  background-color: transparent;
  cursor: ${p => p.theme.cursors.active};
  padding: 8px;
  transition: background-color 200ms ease;
  width: 100%;
  &:hover {
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  }
  ${p => p.footnote && `
    &:after {
      content: "${p.footnote}";
      color: ${p.theme.colors.main};
      float: right;
    }
  `}
`;

// options can be array of strings or array of objects
const Dropdown = ({
  disabled,
  footnote,
  initialSelection,
  iconKey = 'icon',
  labelKey = 'label',
  valueKey = 'value',
  onChange,
  options: rawOptions,
  ...styleProps
}) => {
  const [isObjArr, options] = useMemo(() => {
    if (typeof (rawOptions || [])[0] === 'object') {
      return [true, [...rawOptions]];
    }
    return [false, rawOptions.map((o, i) => ({ [labelKey]: o, [valueKey]: i }))];
  }, [rawOptions]);

  const closeTimer = useRef();

  const [open, setOpen] = useState(false);
  const [popperEl, setPopperEl] = useState();
  const [referenceEl, setReferenceEl] = useState();
  const [selected, setSelected] = useState(
    (options.find((o) => o[valueKey] === initialSelection)) || options[0]
  );

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

  const handleToggle = useCallback(() => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);
  
  const handleSelection = useCallback((option) => () => {
    if (option[valueKey] !== selected[valueKey]) {
      onChange(isObjArr ? option : option[valueKey]);
    }
    setSelected(option);
    setOpen(false);
  }, [onChange, selected]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
    }, 500);
  }, []);

  // useEffect(() => {
  //   const i = initialSelection || 0;
  //   setSelectedIndex(i);
  //   setSelectedLabel(isObjArr ? options[i][labelKey] : options[i]);
  // }, [initialSelection, options]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpen(false);
  }, [disabled]);

  return (
    <Wrapper
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Button
        ref={setReferenceEl}
        disabled={disabled}
        footnote={footnote && selected && footnote(selected)}
        onClick={handleToggle}
        {...styleProps}>
        {selected[iconKey] && <IconWrapper>{selected[iconKey]}</IconWrapper>}
        <label>{selected[labelKey] || ''}</label>
        <Caret>▾</Caret>
        {!styleProps.buttonBorderless && (
          <ButtonClipCorner>
            <ClipCorner
              color={disabled ? '#444' : theme.colors.main}
              dimension={cornerSize} />
          </ButtonClipCorner>
        )}
      </Button>
      {open && createPortal(
        <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000 }} {...attributes.popper}>
          <Options {...styleProps}>
            {options.filter((o) => o[valueKey] !== selected[valueKey]).map((o) => (
              <Option key={o[valueKey]} footnote={footnote && footnote(o)} onClick={handleSelection(o)}>
                {o[iconKey] && <IconWrapper>{o[iconKey]}</IconWrapper>}
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

export default Dropdown;