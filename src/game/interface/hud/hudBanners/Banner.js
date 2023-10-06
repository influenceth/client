import styled from 'styled-components';

import ClipCorner from '~/components/ClipCorner';
import InProgressIcon from '~/components/InProgressIcon';
import { reactBool } from '~/lib/utils';
import theme from '~/theme';

const cornerSize = 15;
const headlineGapSizeHalf = 120;

const Headline = styled.div`
  color: ${p => p.theme.colors.main};
  margin-bottom: 2px;
  font-size: 110%;
  text-align: center;
  text-transform: uppercase;
`;

const Container = styled.div`
  background: transparent;
  border: 1px solid ${p => p.theme.colors.main};
  clip-path: polygon(
    0% 0%,
    ${p => !p.loading ? `
      calc(50% - ${headlineGapSizeHalf}px) 0%,
      calc(50% - ${headlineGapSizeHalf}px) 1px,
      calc(50% + ${headlineGapSizeHalf}px) 1px,
      calc(50% + ${headlineGapSizeHalf}px) 0%,
    ` : ''}
    100% 0%,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    ${cornerSize}px 100%,
    0% calc(100% - ${cornerSize}px)
  );
  padding: 3px;
  pointer-events: all;
  position: relative;

  margin: 0 auto;
  width: ${p => p.loading ? '320px' : '100%'};
  transition: width 250ms ease;
`;

const InnerContainer = styled(Container)`
  align-items: center;
  background: ${p => p.theme.colors.hudMenuBackground};
  border: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 45px;
  padding: 0 12px;
  overflow: hidden;
`;

const Loading = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex: 1;
  & > label {
    flex: 1;
    font-size: 115%;
    margin-right: 42px;
    text-align: center;
    text-transform: uppercase;
  }
`;

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: ${p => p.wide ? 560 : 480}px;
  transform: ${p => p.visible ? 'translateY(20px)' : 'translateY(-80px)'};
  transition: transform 250ms ease;
  & > * {
    white-space: nowrap;
  }

  ${p => p.color && `
    ${Container} {
      border-color: ${p.color};
    }
    ${Headline}, ${Loading} {
      color: ${p.color};
    }
  `}
`;

const Banner = ({ children, headline, isLoading, isVisible, loadingMessage, ...props }) => (
  <Wrapper visible={isVisible} {...props}>
    {headline && <Headline>{headline}</Headline>}
    <Container loading={reactBool(isLoading)}>
      <InnerContainer>
        {isLoading && (
          <Loading>
            <InProgressIcon height={14} />
            {loadingMessage && <label>Searching</label>}
          </Loading>
        )}
        {!isLoading && children}
      </InnerContainer>
      <ClipCorner dimension={cornerSize} color={props.color || theme.colors.main} />
      <ClipCorner dimension={cornerSize} color={props.color || theme.colors.main} flip />
    </Container>
  </Wrapper>
);

export default Banner;