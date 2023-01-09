import { useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';

import useStore from '~/hooks/useStore';

const ButtonRounded = styled.button`
  align-items: center;
  background-color: rgba(${p => p.theme.colors.mainRGB}, 0.3);
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

const Button = (props) => {
  const {
    onClick,
    'data-tip': dataTip,
    'data-place': dataPlace,
    setRef,
    ...restProps } = props;
  const playSound = useStore(s => s.dispatchSoundRequested);

  const _onClick = (e) => {
    playSound('effects.click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), []);

  if (setRef) restProps.ref = setRef;
  return (
    <ButtonRounded
      onClick={_onClick}
      data-tip={dataTip}
      data-place={dataPlace || "right"}
      key={dataTip}
      {...restProps}>
      {props.children}
    </ButtonRounded>
  );
};

export default Button;
