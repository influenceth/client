import React, { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import Details from '~/components/DetailsModal';
import HeroLayout from '~/components/HeroLayout';
import Loader from '~/components/Loader';

const ContentWrapper = styled.div`
  font-size: 110%;
  height: 100%;
  line-height: 1.25em;
  margin-bottom: 25px;
  overflow: auto;
  padding-right: 35px;
  width: 100%;
  scrollbar-width: thin;
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

const ChoicesDialog = ({
  choices,
  choicelessButton,
  choicelessInFooter,
  content,
  contentOverride,
  dialogTitle,
  isHTML,
  isLoading,
  isLoadingChoice,
  onCloseDestination,
  onSelect,
  prompt,
  rightButton,
  ...props
}) => {
  const rightButtonOverride = useMemo(() => {
    if (rightButton) return rightButton;
    
    if (!choices || (choices.length === 1 && !choices[0].text)) {
      if (choicelessButton && choicelessInFooter) {
        return choicelessButton;
      }
    }

    return null;
  }, [choices, choicelessButton, choicelessInFooter, props.rightButton]);

  const contentWrapper = useRef();
  useEffect(() => {
    if (contentWrapper.current) {
      contentWrapper.current.scrollTop = 0;
    }
  }, [content]);

  return (
    <Details
      edgeToEdge
      headerProps={{ background: 'true', v2: 'true' }}
      onCloseDestination={onCloseDestination}
      title={dialogTitle}
      width="1150px">
      {isLoading && <Loader />}
      {!isLoading && (
        <HeroLayout
          rightButton={rightButtonOverride}
          {...props}>
          <>
            {contentOverride}
            {!contentOverride && (
              <ContentWrapper ref={contentWrapper}>
                {content && !isHTML && <PageContent>{content}</PageContent>}
                {content && isHTML && <PageContent dangerouslySetInnerHTML={{ __html: content }} />}
                {prompt && <PagePrompt>{prompt}</PagePrompt>}
                {(choices && !((choices.length === 1 && !choices[0].text)) && choicelessButton) && (
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
                {(!choices || (choices.length === 1 && !choices[0].text)) && choicelessButton && !choicelessInFooter && (
                  <Button
                    onClick={choicelessButton.onClick}
                    {...(choicelessButton.props || {})}
                    style={{ margin: '0 auto' }}>
                    {choicelessButton.label}
                  </Button>
                )}
              </ContentWrapper>
            )}
          </>
        </HeroLayout>
      )}
    </Details>
  );
};

export default ChoicesDialog;
