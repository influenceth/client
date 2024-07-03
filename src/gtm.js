import TagManager from 'react-gtm-module';

export const initializeTagManager = () => {
  if (process.env.REACT_APP_GTM_ID) TagManager.initialize({ gtmId: process.env.REACT_APP_GTM_ID });
};