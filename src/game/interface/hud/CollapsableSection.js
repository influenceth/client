import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled, { css, keyframes } from 'styled-components';
import CrewCard from '~/components/CrewCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';

import { CaptainIcon, CollapsedIcon, CrewIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';

const toggleWidth = 32;

const Uncollapsable = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  pointer-events: all;
`;
const Toggle = styled.div`
  align-items: center;
  display: flex;
  font-size: 28px;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 250ms ease;
  width: ${toggleWidth}px;

  & > svg {
    transform: rotate(${p => p.collapsed ? 0 : `90deg`});
    transition: transform 250ms ease;
  }

  ${Uncollapsable}:hover & {
    opacity: 1;
  }
`;
const Title = styled.div`
  align-items: center;
  color: white;
  display: flex;
  height: 48px;
  transition: border-color 250ms ease;
  width: 100%;
  & > svg {
    font-size: 28px;
    color: #646464;
  }
  & label {
    flex: 1;
    font-size: 18px;
    padding-left: 8px;
  }
`;
const Collapsable = styled.div`
  border-bottom: 1px solid transparent;
  height: 152px;
  overflow: hidden;
  margin-left: ${toggleWidth}px;
  transition: height 250ms ease, border-color 250ms ease;
  ${p => p.collapsed && `
    border-color: #444;
    height: 0;
  `};
`;

const CollapsableSection = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState();
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  return (
    <>
      <Uncollapsable collapsed={collapsed} onClick={toggleCollapse}>
        <Toggle collapsed={collapsed}>
          <CollapsedIcon />
        </Toggle>
        <Title>
          {title}
        </Title>
      </Uncollapsable>
      <Collapsable collapsed={collapsed}>
        {children}
      </Collapsable>
    </>
  );
};

export default CollapsableSection;