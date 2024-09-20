import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import Loader from '~/components/Loader';

const InvisibleImage = styled.img`
  display: none;
`;

const CoverImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 75%;
  width: 100%;
  z-index: 0;

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
    mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 40%, transparent 98%);
    transition:
      background-position 750ms ease-out,
      opacity 750ms ease-out;
  }
`;

const Body = styled.div`
  align-items: flex-end;
  display: flex;
  min-height: 400px;
  width: 100%;
  
  padding: 0 25px 25px;
  position: relative;
  z-index: 1;
`;

const SKULayout = ({
  children,
  coverImage,
  coverImageCenter,
}) => {
  const [imageLoaded, setImageLoaded] = useState();

  useEffect(() => {
    setImageLoaded();
  }, [coverImage]);

  const onImageLoaded = useCallback(() => {
    setImageLoaded(coverImage);
  }, [coverImage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', position: 'relative' }}>
      <InvisibleImage src={coverImage} onError={onImageLoaded} onLoad={onImageLoaded} />
      <CoverImage
        src={imageLoaded}
        center={coverImageCenter}
        ready={coverImage === imageLoaded} />
      <Body>
        {imageLoaded ? children : <div style={{ justifySelf: 'center' }}><Loader /></div>}
      </Body>
    </div>
  );
};

export default SKULayout;