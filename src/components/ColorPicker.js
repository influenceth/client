import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { CompactPicker } from 'react-color';
import IconButton from './IconButton';
import { usePopper } from 'react-popper';
import { createPortal } from 'react-dom';

const StyledColorPicker = styled.div`
  flex: 0 0 auto;
  position: relative;
`;

const Toggle = styled(IconButton)`
  border: 0;
  display: flex;
  margin-right: 3px;
  padding: unset;
  height: 18px;
  width: 18px;
  &:before {
    align-self: center;
    background-color: ${p => p.color};
    border-radius: 1px;
    content: "";
    display: inline-block;
    height: 9px;
    justify-self: center;
    width: 9px;
  }
`;

const StyledCompactPicker = styled(CompactPicker)`
  background-color: ${p => p.theme.colors.contentDark};

  & input {
    color: white !important;
    font-family: 'Jura', sans-serif !important;
  }
`;

const Cover = styled.div`
  bottom: 0;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1;
`;

const ColorPicker = ({ onChange, initialColor, ...restProps}) => {
  const [open, setOpen] = useState();
  const [color, setColor] = useState(initialColor || '#AB149E');
  const [popperEl, setPopperEl] = useState();
  const [referenceEl, setReferenceEl] = useState();

  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'left',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });

  const handleChangeComplete = useCallback((newColor) => {
    setColor(newColor.hex);
    if (onChange) onChange(newColor.hex);
  }, [onChange]);

  const onClickAway = useCallback((e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  }, []);

  const onClick = useCallback((e) => {
    e.stopPropagation();
    setOpen(true);
  }, []);

  const stopProp = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <StyledColorPicker ref={setReferenceEl} {...restProps}>
        <Toggle
          data-tooltip-content="Change highlight color"
          data-tooltip-id="global"
          color={color}
          onClick={onClick} />
      </StyledColorPicker>
      {open && (
        <>
          <Cover onClick={onClickAway} />
          {createPortal(
            <div
              ref={setPopperEl}
              onClick={stopProp}
              style={{ ...styles.popper, zIndex: 1000 }}
              {...attributes.popper}>
              <StyledCompactPicker
                color={color}
                onChangeComplete={handleChangeComplete} />
            </div>,
            document.body
          )}
        </>
      )}
    </>
  );
}

export default ColorPicker;
