import TagManager from 'react-gtm-module';
const gtmId = 'G-7PMQTNHEDF';

export const initializeTagManager = () => {
  if (process.env.REACT_APP_DEPLOYMENT) TagManager.initialize({ gtmId });
};