import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import ClipCorner from './ClipCorner';

export const borderColor = '#333';
const cornerSize = 35;

const Wrapper = styled.div`
  align-items: center;
  backdrop-filter: blur(2px);
  display: flex;
  flex: 1;
  height: 100%;
  justify-content: center;
  padding: 25px;
  position: relative;
  overflow: hidden;
  width: 100%;
  z-index: ${p => p.modalMode ? 1001 : 4};

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0 0 50px 0;
    z-index: 1;
  }
`;

const StyledDetails = styled.div`
  background-color: black;
  border: 1px solid ${borderColor};
  ${p => p.theme.clipCorner(cornerSize)};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  position: relative;

  ${p => !p.modalMode && `
    height: 100%;
    width: 100%;
  `}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    clip-path: none;
  }
`;

const headerHeight = 40;
const HeaderWrapper = styled.div`
  padding: 15px 20px 0;
  ${p => p.edgeToEdge
    ? `
      background: rgba(255, 255, 255, 0.08);
      padding-bottom: 15px;
    `
    : `
      &:after {
        content: "";
        display: block;
        border-bottom: 1px solid ${borderColor};
        margin-top: 12px;
        position: relative;
        z-index: 2;
      }
    `}
`;
const Header = styled.h1`
  border-left: 3px solid ${p => p.theme.colors.main};
  font-size: 22px;
  font-weight: 400;
  height: ${headerHeight}px;
  line-height: ${headerHeight}px;
  margin: 0;
  padding: 0 0 0 15px;
  position: relative;
  text-transform: uppercase;
  z-index: 1;

  & b {
    color: ${p => p.theme.colors.main};
    font-weight: normal;
    margin-left: 10px;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-left: 20px;
  }
`;

const ContentWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 12px 20px 0;

  ${p => {
    if (p.edgeToEdge) {
      if (p.hasTitle) {
        return `
          margin: -60px 0 0;
          & ${Content} { margin-top: 60px; }
        `;
      }
      return 'margin: 0;';
    }
    return 'margin: 0;';
  }}
`;

const Content = styled.div`
  height: 100%;
  min-width: 0;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: 0;
  }
`;

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 20px;
  right: 20px;
  z-index: 1;
  ${p => p.hasBackground ? 'background: rgba(0, 0, 0, 0.75);' : ''}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const CoverImage = styled.div`
  position: absolute;
  height: ${p => p.height || '50%'};
  width: 100%;
  z-index: -1;

  &:before {
    background-color: #111;
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: ${p => p.center || 'center center'};
    background-size: cover;
    content: '';
    display: block;
    height: 100%;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%);
    transition:
      background-position 750ms ease-out,
      opacity 750ms ease-out;
  }
`;

const Details = (props) => {
  const {
    title,
    contentProps = {},
    coverImage,
    coverImageHeight,
    edgeToEdge,
    onClose,
    onCloseDestination,
    ...restProps } = props;
  const history = useHistory();

  return (
    <Wrapper {...restProps}>
      <StyledDetails {...restProps}>
        {title && <HeaderWrapper edgeToEdge={edgeToEdge}><Header>{title}</Header></HeaderWrapper>}
        <CloseButton
          onClick={onClose || (() => history.push(onCloseDestination || '/'))}
          hasBackground={edgeToEdge}
          borderless>
          <CloseIcon />
        </CloseButton>
        {coverImage && <CoverImage {...coverImage} />}
        <ContentWrapper edgeToEdge={edgeToEdge} hasTitle={!!title}>
          <Content {...contentProps}>
            {props.children}
          </Content>
        </ContentWrapper>
        <ClipCorner dimension={cornerSize} color={borderColor} />
      </StyledDetails>
    </Wrapper>
  );
};

export default Details;
