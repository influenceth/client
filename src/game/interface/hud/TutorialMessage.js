import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import { reactBool } from '~/lib/utils';
import theme from '~/theme';

const messageClipCorner = 20;
const messageOffset = 75;
const messageHeight = 235;
const messageWidth = 700;
const crewmateOverflowMult = 0.3;
const borderColor = `rgba(${theme.colors.mainRGB}, 0.33)`;
const CrewmateWrapper = styled.div`
  margin: 1px;
  background: linear-gradient(
    to top,
    rgba(${p => p.theme.colors.mainRGB}, 0.5) 0%,
    rgba(0, 0, 0, 0.5) 70%
  );
`;

const CrewmateOverflow = styled.div`
  overflow: hidden;
  position: relative;
`;

const CrewmateImage = styled.div`
  background-image: ${p => p.crewmateId ? `url("${process.env.REACT_APP_IMAGES_URL}/v1/crew/${p.crewmateId}/image.svg?bustOnly=true")` : 'none'};
  background-position: top center;
  background-repeat: no-repeat;
  background-size: cover;
  padding-top: 140%;
  width: 100%;
`;

const TutorialMessageWrapper = styled.div`
  display: flex;
  flex-direction: row;
  position: fixed;
  bottom: ${messageOffset}px;
  height: ${p => p.messageHeight || messageHeight}px;
  left: calc(50% - ${messageWidth/2}px);
  pointer-events: all;
  transition: transform 250ms ease;
  transform: translateY(${p => p.isIn ? 0 : ((p.messageHeight || messageHeight) * (1 + crewmateOverflowMult) + messageOffset)}px);
  width: ${messageWidth}px;
  z-index: 1000000;
  &:before {
    content: "";
    ${p => p.theme.clipCorner(messageClipCorner)};
    background: #000a0f;
    border: 1px solid ${borderColor};
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: -1;
  }

  ${CrewmateWrapper} {
    flex: 0 0 ${p => 0.923 * (p.messageHeight || messageHeight)}px;
  }
  ${CrewmateOverflow} {
    height: ${p => (p.messageHeight || messageHeight) * (1 + crewmateOverflowMult)}px;
    top: -${p => (p.messageHeight || messageHeight) * crewmateOverflowMult}px;
  }
`;

const TutorialContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 15px;
  & > h3 {
    align-items: center;
    display: flex;
    font-size: 18px;
    font-weight: normal;
    text-transform: uppercase;
    margin: 0;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    & > span {
      flex: 1;
    }
    & > button {
      margin-right: 0;
    }
  }
  & > div {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 12px 0;
    & > div:first-child {
      color: ${p => p.theme.colors.secondaryText};
      flex: 1;
      font-size: 90%;
      line-height: 120%;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  & > * {
    margin-left: 6px;
  }
`;

const TutorialMessage = ({ crewmateId, isIn, leftButton, onClose, rightButton, step, ...props }) => {
  return (
    <TutorialMessageWrapper isIn={reactBool(isIn)} {...props}>
      {step && (
        <>
          <CrewmateWrapper>
            <CrewmateOverflow>
              <CrewmateImage crewmateId={crewmateId} />
            </CrewmateOverflow>
          </CrewmateWrapper>

          <TutorialContent>
            <h3>
              <span>{step?.title}</span>
              <IconButton onClick={onClose} scale={0.75}><CloseIcon /></IconButton>
            </h3>
            <div>
              <div>{step?.content}</div>
              <Buttons>
                {leftButton && (
                  <Button flip size="small" {...leftButton} />
                )}
                {rightButton && (
                  <Button size="small" {...rightButton} />
                )}
              </Buttons>
            </div>
          </TutorialContent>
        </>
      )}

      <ClipCorner dimension={messageClipCorner} color={borderColor} offset={-1} />
    </TutorialMessageWrapper>
  );
}

export default TutorialMessage;