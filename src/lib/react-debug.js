import * as React from  'react';

// TO USE THIS:
// - search and replace all `useCallback (` with `useCallback (import.meta.url, ` [*** remove spaces ***]
// - search and replace all `useEffect (` with `useEffect (import.meta.url, ` [*** remove spaces ***]
// - search and replace all `useLayoutEffect (` with `useLayoutEffect (import.meta.url, ` [*** remove spaces ***]
// - search and replace all `useMemo (` with `useMemo (import.meta.url, ` [*** remove spaces ***]
// - search and replace all `from ' react'` with `from ' ~/lib/react-debug'`  [*** remove spaces ***]
// - (fix this file if the React.use* were overwritten below or import above)

// TO UN-USE THIS:
// - search and replace all `( import.meta.url, ` with `(`  [*** remove space ***]
// - search and replace all `from ' ~/lib/react-debug'` with `from ' react'` [*** remove spaces ***]


const enableLogs = false;

const cleanse = (filename) => {
  return filename.split('/src')[1];
}

const useCallbackDebug = (fileName, callback, dependencies) => {
  return React.useMemo (() => {
    if (enableLogs) console.log('useCallback', cleanse(fileName), dependencies.length);
    return callback;
  }, [...dependencies]);
};

const useEffectDebug = (fileName, callback, dependencies) => {
  return React.useEffect (() => {
    if (enableLogs) console.log('useEffect', cleanse(fileName), dependencies.length);
    return callback();
  }, [...dependencies]);
};

const useMemoDebug = (fileName, callback, dependencies) => {
  return React.useMemo (() => {
    if (enableLogs) console.log('useMemo', cleanse(fileName), dependencies.length);
    return callback();
  }, [...dependencies]);
};

const reactWithMods = {
  ...React,
  useCallback: useCallbackDebug,
  useEffect: useEffectDebug,
  useMemo: useMemoDebug,
};

export const useCallback = useCallbackDebug;
export const useEffect = useEffectDebug;
export const useMemo = useMemoDebug;

export const createContext = React.createContext;
export const forwardRef = React.forwardRef;
export const useContext = React.useContext;
export const useLayoutEffect = React.useLayoutEffect;
export const useRef = React.useRef;
export const useState = React.useState;
export const Component = React.Component;
export const Fragment = React.Fragment;
export const Suspense = React.Suspense;

export default reactWithMods;