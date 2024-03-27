import { useEffect } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import useStore from '~/hooks/useStore';

const Button = styled.button`
  align-items: center;
  background-color: rgba(${p => p.disabled ? '90, 90, 90' : p.theme.colors.mainRGB}, 0.3);
  border: ${p => p.buttonBorderless ? 'none' : `1px solid ${p.disabled ? '#444' : p.theme.colors.main}`};
  border-radius: 6px;
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors[p.disabled ? 'default' : 'active']};
  display: flex;
  flex-direction: row;
  font-family: 'Jura', sans-serif;
  font-size: 80%;
  font-weight: bold;
  justify-content: center;
  opacity: ${p => p.disabled ? 0.7 : 1};
  outline: 0;
  overflow: hidden;
  padding: 12px;
  text-align: left;
  text-overflow: ellipsis;
  text-transform: uppercase;
  transition: background-color 200ms ease;
  white-space: nowrap;
  width: ${p => p.buttonWidth || 'auto'};

  & > svg {
    color: white;
    margin-right: 6px;
  }

  ${p => !p.disabled && `
    &:hover {
      background-color: rgba(${p.theme.colors.mainRGB}, 0.3);
    }
  `}
`;

const ButtonRounded = (props) => {
  const {
    onClick,
    'data-tip': dataTip,
    'data-place': dataPlace,
    setRef,
    ...restProps } = props;
  const playSound = useStore(s => s.dispatchEffectStartRequested);

  const _onClick = (e) => {
    playSound('click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), []);

  if (setRef) restProps.ref = setRef;
  return (
    <Button
      onClick={_onClick}
      data-tip={dataTip}
      data-place={dataPlace || "right"}
      key={dataTip}
      {...restProps}>
      {props.children}
    </Button>
  );
};

export const IconButtonRounded = styled(ButtonRounded)`
  padding: ${p => p.flatter ? '4px 16px' : '10px'};
  & > svg {
    font-size: ${p => p.flatter ? 'initial' : '20px'};
    margin-right: 0;
  }
`;

export default ButtonRounded;
