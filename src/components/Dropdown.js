import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
`;

const Button = styled.button`
  background-color: ${p => p.buttonBackground ? `rgba(${p.theme.colors.mainRGB}, 0.4)` : 'transparent'};
  border: ${p => p.buttonBorderless ? 'none' : `1px solid ${p.disabled ? '#444' : p.theme.colors.main}`};
  color: white;
  cursor: ${p => p.theme.cursors[p.disabled ? 'default' : 'active']};
  font-family: 'Jura', sans-serif;
  font-size: 80%;
  opacity: ${p => p.disabled ? 0.7 : 1};
  outline: 0;
  overflow: hidden;
  padding: 4px 5px;
  text-align: left;
  text-overflow: ellipsis;
  transition: background-color 200ms ease;
  white-space: nowrap;
  width: ${p => p.width || 'auto'};
  &:before {
    content: "▾";
    float: right;
    font-size: 80%;
    line-height: 1.44em;
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
      float: right;
      font-size: 80%;
      line-height: 145%;
      margin-right: 2px;
    }
  `}

  ${p => !p.disabled && `
    &:hover {
      background-color: rgba(${p.theme.colors.mainRGB}, 0.3);
    }
  `}
`;
const Options = styled.div`
  background: #111;
  font-size: 80%;
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
const Dropdown = ({ disabled, footnote, initialSelection, labelKey = 'label', onChange, options, resetOn, ...styleProps }) => {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(initialSelection || 0);
  const [selectedLabel, setSelectedLabel] = useState();

  const closeTimer = useRef();

  const isObjArr = typeof (options || [])[0] === 'object';

  const handleToggle = useCallback(() => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);
  
  const handleSelection = useCallback((index) => () => {
    if (selectedIndex !== index) {
      onChange(options[index]);
    }
    setSelectedIndex(index);
    setOpen(false);
  }, [onChange, options, selectedIndex]);

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

  useEffect(() => {
    const i = initialSelection || 0;
    setSelectedIndex(i);
    setSelectedLabel(isObjArr ? options[i][labelKey] : options[i]);
  }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedLabel(isObjArr ? options[selectedIndex][labelKey] : options[selectedIndex]);
  }, [selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpen(false);
  }, [disabled]);

  return (
    <Wrapper
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Button
        disabled={disabled}
        footnote={footnote && options[selectedIndex] && footnote(options[selectedIndex])}
        onClick={handleToggle}
        {...styleProps}>
        {selectedLabel || ''}
      </Button>
      {open && (
        <Options {...styleProps}>
          {options.map((o, i) => (
            <Option key={i} footnote={footnote && footnote(o)} onClick={handleSelection(i)}>
              {isObjArr ? o[labelKey] : o}
            </Option>
          ))}
        </Options>
      )}
    </Wrapper>
  );
};

export default Dropdown;