import React, { useEffect, useState } from '~/lib/react-debug';
import styled from 'styled-components';

const SvgWrapper = styled.span`
  opacity: ${p => p.ready ? 1 : 0};
  transition: opacity 125ms ease-out;
`;

const SvgFromSrc = ({ src }) => {
  const [svg, setSvg] = useState(null);
  //const [isLoaded, setIsLoaded] = useState(false);
  //const [isErrored, setIsErrored] = useState(false);

  useEffect(import.meta.url, () => {
      fetch(src)
        .then(res => res.text())
        .then(setSvg)
        //.catch(setIsErrored)
        //.then(() => setIsLoaded(true))
      ;
  }, [src]);

  return (
    <SvgWrapper className="icon-from-src-wrapper" ready={!!svg} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export default SvgFromSrc;