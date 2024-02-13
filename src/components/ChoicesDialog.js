import React, { useCallback, useState } from 'react';
import styled, { keyframes } from 'styled-components';

import Button from '~/components/ButtonAlt';
import Details from '~/components/DetailsModal';
import Loader from '~/components/Loader';

const foldOffset = 28;
const belowFoldMin = 256;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const InvisibleImage = styled.img`
  display: none;
`;

const CoverImage = styled.div`
  height: calc(50% + ${foldOffset}px);
  max-height: calc(100% - ${foldOffset}px - ${belowFoldMin}px);

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 33%;
    max-height: none;
  }

  &:before {
    background-color: #111;
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: ${p => p.center || 'center center'};
    background-size: cover;
    content: '';
    display: block;
    opacity: ${p => p.ready ? 1 : 0};
    height: 100%;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%);
    transition:
      background-position 750ms ease-out,
      opacity 750ms ease-out;
  }
`;

const aboveFoldHeight = 88;
const aboveFoldMobileMargin = -30;
const AboveFold = styled.div`
  height: ${p => (p.hasSubtitle ? 50 : 0) + aboveFoldHeight}px;
  margin-top: -${p => (p.hasSubtitle ? 50 : 0) + aboveFoldHeight}px;
  opacity: 0;
  padding: 0 35px;
  position: relative;
  z-index: 1;

  opacity: ${p => p.ready ? 1 : 0};
  transition: opacity 750ms ease-out;

  ${p => !p.hasSubtitle && `
    ${Rule} {
      margin-top: 20px;
    }
  `}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: ${aboveFoldHeight * 0.72}px;
    margin-top: ${aboveFoldMobileMargin}px;
    padding: 0 25px;
  }
`;

const Rule = styled.div`
  height: 0;
  border-bottom: 1px solid #333;
`;

const BelowFold = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(50% - ${foldOffset}px);
  padding: 10px 0 10px 35px;
  position: relative;
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    min-height: ${belowFoldMin}px;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: calc(67% - ${aboveFoldHeight + aboveFoldMobileMargin}px);
    padding: 10px 0 0;
  }

  & > * {
    opacity: 0;
    &:nth-child(1) {
      animation: ${opacityTransition} 600ms normal forwards ease 200ms;
    }
    &:nth-child(2) {
      animation: ${opacityTransition} 600ms normal forwards ease 400ms;
    }
    &:nth-child(3) {
      animation: ${opacityTransition} 600ms normal forwards ease 600ms;
    }
  }
`;

const Title = styled.div`
  color: white;
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  font-size: 45px;
  pointer-events: none;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 28px;
    text-align: left;
  }
`;

const Subtitle = styled.div`
  color: white;
  height: 40px;
  margin-top: 20px;
  margin-bottom: 6px;
`;

const Body = styled.div`
  flex: ${p => p.flourishWidth ? '1' : '0'} 1 840px;
  height: 100%;
  overflow: hidden;
  padding: 0 35px ${p => p.hasContentOverride ? '0' : '25px'} 25px;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-top: 5px;
  }
`;
const BodyInner = styled.div`
  font-size: 110%;
  height: 100%;
  line-height: 1.25em;
  overflow: auto;
  padding-right: 65px;
  width: 100%;
  scrollbar-width: thin;
`;

const FlourishWrapper = styled.div`
  align-items: center;
  display: flex;
  flex: ${p => p.flourishWidth ? `0 0 ${p.flourishWidth}px` : '1 0 250px'};
  flex-direction: column;
  justify-content: center;
  overflow: hidden;

  @media (max-width: 1300px) {
    display: none;
  }
`;

const Path = styled.div`
  cursor: ${p => p.theme.cursors.active};
  background-color: rgba(255, 255, 255, 0);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 0;
  transition: background-color 200ms ease;

  &:first-child {
    border-top: 1px solid rgba(255, 255, 255,0.2);
  }

  & > div {
    align-items: flex-start;
    display: flex;
    padding: 6px 16px 6px 0;

    & > span:first-child {
      color: white;
      font-weight: bold;
      text-align: center;
      width: 3em;
    }
    & > span:last-child {
      color: ${p => p.theme.colors.main};
      flex: 1;
      transition: color 200ms ease;
      & b {
        color: white;
        font-weight: normal;
        white-space: nowrap;
      }
    }
  }

  ${p => p.selected ? '&' : '&:hover'} > div {
    background-color: rgba(255, 255, 255, 0.2);
    & > span:last-child {
      color: white;
    }
  }
`;

const PageContent = styled.div`
  color: #aaa;
  white-space: pre-line;
  margin-bottom: 1.5em;
`;
const PagePrompt = styled.div`
  color: white;
  margin-bottom: 1em;
`;

const Footer = styled.div`
  background: black;
  padding: 0 35px;
  height: 80px;
`;

const ChoicesDialog = ({
  choices,
  choicelessButton,
  content,
  contentOverride,
  coverImage,
  coverImageCenter,
  dialogTitle,
  flourish,
  flourishWidth,
  isHTML,
  isLoading,
  isLoadingChoice,
  leftButton,
  onCloseDestination,
  onSelect,
  prompt,
  rightButton,
  title,
  subtitle
}) => {
  const [coverImageLoaded, setCoverImageLoaded] = useState();

  const onCoverImageLoad = useCallback(() => {
    setCoverImageLoaded(coverImage);
  }, [coverImage]);

  const isLoadingImage = isLoading || isLoadingChoice || coverImage !== coverImageLoaded;
  return (
    <Details
      edgeToEdge
      headerProps={{ background: 'true', v2: 'true' }}
      onCloseDestination={onCloseDestination}
      title={dialogTitle}
      width="1150px">
      {isLoading && <Loader />}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <InvisibleImage src={coverImage} onError={onCoverImageLoad} onLoad={onCoverImageLoad} />
          <CoverImage
            src={coverImageLoaded}
            center={coverImageCenter}
            ready={coverImage === coverImageLoaded} />
          <AboveFold ready={!!coverImageLoaded} hasSubtitle={!!subtitle}>
            {title && <Title>{title}</Title>}
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
            <Rule />
          </AboveFold>
          <BelowFold>
            {isLoadingImage && <Loader />}
            {!isLoadingImage && (
              <>
                {flourish && <FlourishWrapper flourishWidth={flourishWidth}>{flourish}</FlourishWrapper>}
                <Body hasContentOverride={!!contentOverride} flourishWidth={flourishWidth}>
                  {contentOverride}
                  {!contentOverride && (
                    <BodyInner>
                      {content && isHTML && <PageContent>{content}</PageContent>}
                      {content && !isHTML && <PageContent dangerouslySetInnerHTML={{ __html: content }} />}
                      {prompt && <PagePrompt>{prompt}</PagePrompt>}
                      {choices && (
                        <div>
                          {choices.map((choice, i) => (
                            <Path key={choice.id} onClick={onSelect(choice)}>
                              <div>
                                <span>{String.fromCharCode(65 + i)}</span>
                                <span>{choice.text}</span>
                              </div>
                            </Path>
                          ))}
                        </div>
                      )}
                      {!choices && choicelessButton && (
                        <Button
                          onClick={choicelessButton.onClick}
                          style={{ margin: '0 auto' }}>
                          {choicelessButton.label}
                        </Button>
                      )}
                    </BodyInner>
                  )}
                </Body>
              </>
            )}
          </BelowFold>
          <Footer>
            <Rule />
            <div style={{ alignItems: 'center', display: 'flex', height: 'calc(100% - 1px)', justifyContent: 'space-between' }}>
              <div>{leftButton && <Button {...(leftButton.props || {})} onClick={leftButton.onClick} subtle>{leftButton.label}</Button>}</div>
              {rightButton
                ? (
                  <div style={{ alignItems: 'center', display: 'flex' }}>
                    {rightButton.preLabel || ''}
                    <Button {...(rightButton.props || {})} onClick={rightButton.onClick} subtle>{rightButton.label}</Button>
                  </div>
                )
                : <div />
              }
            </div>
          </Footer>
        </div>
      )}
    </Details>
  );
};

export default ChoicesDialog;
