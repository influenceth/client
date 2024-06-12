import styled, { keyframes } from 'styled-components';
import LoadingIcon from 'react-spinners/PuffLoader';

const fadeOut = keyframes`
  0% { opacity: 0.8; }
  50% { opacity: 0.8; }
  100% { opacity: 0; }
`;

const Backdrop = styled.div`
  animation: ${fadeOut} 1000ms linear 1;
  background: black;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  position: fixed;
  z-index: 1000;
`;

const Button = styled.button`
  background: ${p => p.success
    ? `linear-gradient(to right, #2baa54, #35ca6e)`
    : `linear-gradient(to right, #2b6caa, #35a4ca)`
  };
  border: 0;
  border-radius: 6px;
  color: white;
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 18px;
  font-weight: ${p => p.bold ? 700 : 400};
  outline: solid rgba(255,255,255,0.9);
  outline-width: 0;
  padding: 15px 25px;
  position: relative;
  text-transform: uppercase;
  transition: all 100ms linear;
  white-space: ${p => p.noWrap ? 'nowrap' : 'normal'};
  ${p => p.attention && `
    outline-color: orangered;
    outline-width: 4px;
    z-index: 1001;
  `}
  ${p => p.subtle && `
    background: rgba(${p.theme.colors.darkMainRGB}, 0.5);
    outline: 1px solid ${p.theme.colors.brightMain};
    color: ${p.theme.colors.brightMain};
    opacity: 0.5;
    &:hover {
      color: white;
      opacity: 1;
      outline-color: white;
    }
  `};

  & > div:last-child {
    flex: 1;
    text-align: center;
  }

  &:hover {
    outline-width: 3px;
  }

  &:active {
    background-color: ${p => p.theme.colors.main};
  }

  &:disabled {
    background: linear-gradient(to right, #333333, #22222a);
    cursor: ${p => p.theme.cursors.default};
    opacity: 0.7;
    outline-width: 0;
  }
`;

const Loader = styled.div`
  position: relative;
  height: 24px;
  margin: -2px 0;
  width: 24px;
  & > span {
    position: static;
  }
  ${p => !p.loaderOnly && `
    margin-left: -10px;
    width: 30px;
  `}
`;

const BrightButton = ({ attention, children, loading, ...props }) => {
  return (
    <>
      {attention && <Backdrop />}
      <Button attention={attention} {...props}>
        {loading && <Loader loaderOnly={!children}><LoadingIcon color="white" size={24} /></Loader>}
        <div>{children}</div>
      </Button>
    </>
  );
};

export default BrightButton;