import { useState } from 'react';
import styled from 'styled-components';
import { CompactPicker } from 'react-color';
import { IoIosColorFill as ColorIcon } from 'react-icons/io';

const StyledColorPicker = styled.div`
  flex: 0 0 auto;
`;

const Toggle = styled.div`
  height: 30px;
  padding: 5px;
  width: 30px;

  & svg {
    color: ${props => props.color};
    height: 20px;
    width: 20px;
  }
`;

const PickerContainer = styled.div`
  left: 20px;
  margin-top: -31px;
  position: absolute;
  z-index: 2;
`;

const StyledCompactPicker = styled(CompactPicker)`
  background-color: ${props => props.theme.colors.contentDark};

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
`;

const ColorPicker = (props) => {
  const { onChange, initialColor, ...restProps} = props;
  const [ open, setOpen ] = useState(false);
  const [ color, setColor ] = useState(initialColor || '#AB149E');

  const handleChangeComplete = (newColor) => {
    setColor(newColor.hex);
    if (onChange) onChange(newColor.hex);
  };

  return (
    <StyledColorPicker {...restProps}>
      <Toggle
        data-tip="Change highlight color"
        data-for="global"
        color={color}
        onClick={() => setOpen(true)}>
        <ColorIcon />
      </Toggle>
      {open && (
        <>
          <PickerContainer>
            <StyledCompactPicker
              color={color}
              onChangeComplete={handleChangeComplete} />
          </PickerContainer>
          <Cover onClick={() => setOpen(false)} />
        </>
      )}
    </StyledColorPicker>
  );
};

export default ColorPicker;
