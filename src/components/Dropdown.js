import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Button = styled.button`
  background-color: transparent;
  border: 1px solid ${p => p.disabled ? '#444' : p.theme.colors.main};
  color: white;
  cursor: ${p => p.theme.cursors[p.disabled ? 'default' : 'active']};
  font-family: 'Jura', sans-serif;
  font-size: 80%;
  opacity: ${p => p.disabled ? 0.7 : 1};
  outline: 0;
  overflow: hidden;
  padding: 5px;
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
    padding-left: 5px;
  }

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
`;
const Option = styled.div`
  background-color: transparent;
  cursor: ${p => p.theme.cursors.active};
  padding: 5px;
  transition: background-color 200ms ease;
  &:hover {
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  }
`;

// options can be array of strings or array of objects
const Dropdown = ({ disabled, initialSelection, labelKey = 'label', onChange, options, resetOn, ...styleProps }) => {
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
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Button disabled={disabled} onClick={handleToggle} {...styleProps}>{selectedLabel || ''}</Button>
      {open && (
        <Options {...styleProps}>
          {options.map((o, i) => (
            <Option key={i} onClick={handleSelection(i)}>{isObjArr ? o[labelKey] : o}</Option>
          ))}
        </Options>
      )}
    </div>
  );
};

export default Dropdown;