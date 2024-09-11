import { useCallback } from '~/lib/react-debug';
import styled from 'styled-components';

import { ChevronDoubleRightIcon, InfluenceIcon } from '~/components/Icons';
import ClipCorner from '~/components/ClipCorner';

const supportMenuCornerSize = 18;
const SupportWrapper = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
  border: 1px solid ${p => p.theme.colors.darkMain};
  ${p => p.theme.clipCorner(supportMenuCornerSize)};
  cursor: ${p => p.theme.cursors.active};
  margin: 0 16px;
  padding: 8px 8px 0;
  position: relative;
  transition: background 150ms ease, border-color 150ms ease;

  & > h3 {
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: row;
    font-size: 14px;
    justify-content: space-between;
    margin: 0;
    padding: 2px 0 10px;
    text-transform: uppercase;
    width: 100%;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 10px;
    }
  }
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    padding: 20px 0 24px;
    & > span {
      align-items: center;
      background: black;
      border-radius: 60px;
      display: flex;
      flex: 0 0 60px;
      height: 60px;
      justify-content: center;
      & > svg {
        height: 50px;
        width: 50px;
      }
    }
    & > div {
      color: #AAA;
      font-size: 12px;
      padding-left: 10px;
      b {
        color: white;
        font-weight: normal;
      }
    }
  }

  & > svg:last-child {
    transition: color 150ms ease;
    color: ${p => p.theme.colors.darkMain};
  }

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.25);
    border-color: ${p => p.theme.colors.main};
    & > svg:last-child {
      color: ${p => p.theme.colors.main};
    }
  }
`;

const SupportMenu = () => {
  const goToDiscord = useCallback(import.meta.url, () => {
    window.open(process.env.REACT_APP_HELP_URL);
  }, []);
  return (
    <SupportWrapper onClick={goToDiscord}>
      <h3>
        <label>Support in Discord</label>
        <ChevronDoubleRightIcon />
      </h3>
      <div>
        <span><InfluenceIcon /></span>
        <div>
          Have a question, encounter an issue, or require specific support?
          Enquire in the game's <b>Official Discord Server</b>.
        </div>
      </div>
      <ClipCorner dimension={supportMenuCornerSize} />
    </SupportWrapper>
  );
};

export default SupportMenu;