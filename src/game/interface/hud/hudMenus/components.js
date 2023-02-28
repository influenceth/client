import styled, { keyframes } from 'styled-components';

import CollapsibleSection from '~/components/CollapsibleSection';

export const trayHeight = 80;
export const majorBorderColor = 'rgba(255, 255, 255, 0.2)';

export const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

export const Scrollable = styled.div`
  height: ${p => p.hasTray ? `calc(100% - ${trayHeight}px)` : '100%'};
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -12px;
`;

export const Tray = styled.div`
  align-items: center;
  border-top: 1px solid ${majorBorderColor};
  display: flex;
  flex-direction: row;
  height: ${trayHeight}px;
`;

export const SectionTitle = styled.div`
  font-size: 16px;
  text-transform: uppercase;
  width: 100%;
  ${p => p.label && `
    &:after {
      content: "${p.label}";
      color: #777;
      float: right;
      font-size: 14px;
      text-transform: none;
    }
  `}
`;

export const Rule = styled.div`
  border-bottom: 1px solid ${majorBorderColor};
  margin: ${p => p.margin || '6px'} 0;
  width: 100%;
`;

export const HudMenuCollapsibleSection = ({ children, collapsed, titleText, titleLabel, ...props }) => (
  <CollapsibleSection
    title={(<SectionTitle label={titleLabel}>{titleText}</SectionTitle>)}
    collapsibleProps={{
      borderColor: majorBorderColor,
      width: 'calc(100% - 36px)'
    }}
    initiallyClosed={!!collapsed}
    {...props}>
    {children}
  </CollapsibleSection>
);
