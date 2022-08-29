import { useCallback, useState, } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { usePopper } from 'react-popper';

const Dropdown = styled.div`
  position: absolute;
  z-index: 1001;
  background: #111;
  & > div {
    color: ${p => p.theme.colors.main};
    cursor: ${p => p.theme.cursors.active};
    padding: 8px 20px;
    &:hover {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
    }
  }
`;
const Backdrop = styled.div`
  background: rgba(0, 0, 0, 0.2);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
`;

const MarketplaceSelector = ({ referenceEl, onClose, onSelect }) => {
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'bottom-start'
  });
  return createPortal((
    <>
      <Dropdown ref={setPopperEl} style={styles.popper} {...attributes.popper}>
        <div onClick={() => onSelect('Aspect')}>Aspect</div>
        <div onClick={() => onSelect('Mintsquare')}>MintSquare</div>
      </Dropdown>
      <Backdrop onClick={onClose} />
    </>
  ), document.body);
}

const MarketplaceLink = ({ assetType, chain, children, id }) => {
  const [referenceEl, setReferenceEl] = useState();
  const [marketplaceDropdownOpen, setMarketplaceDropdownOpen] = useState();

  const handleMarketplaceClick = useCallback((which) => {
    let url;

    // Ethereum > OpenSea
    if (chain === 'ETHEREUM') {
      url = `${process.env.REACT_APP_ETHEREUM_NFT_MARKET_URL}/`;
      // single asset
      if (assetType === 'asteroid' && id) {
        url += `assets/${process.env.REACT_APP_CONTRACT_ASTEROID_TOKEN}/${id}`;
      } else if(assetType === 'crewmate' && id) {
        // TODO: should theoretically also support v2 crew token here
        url += `assets/${process.env.REACT_APP_CONTRACT_CREW_TOKEN}/${id}`;
      // collection (NOTE: these are not used currently)
      } else if (assetType === 'asteroid') {
        url += `influenceth-asteroids`;
      } else if (assetType === 'crewmate') {
        url += `influence-crew`;
      // account
      } else if (assetType === 'account') {
        url += `${id}`;
      }

    // Starknet > Aspect
    } else if (which === 'Aspect') {
      url = `${process.env.REACT_APP_ASPECT_URL}/`;
      // single asset
      if (assetType === 'asteroid' && id) {
        url += `asset/${process.env.REACT_APP_STARKNET_ASTEROID_TOKEN}/${id}`;
      } else if(assetType === 'crewmate' && id) {
        url += `asset/${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}/${id}`;
      // collection
      } else if (assetType === 'asteroid') {
        url += `collection/${process.env.REACT_APP_STARKNET_ASTEROID_TOKEN}`;
      } else if (assetType === 'crewmate') {
        url += `collection/${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}`;
      // account
      } else if (assetType === 'account') {
        url += `accounts/${id}`;
      }
      
    // Starknet > Mint Square
    } else if (which === 'Mintsquare') {
      url = `${process.env.REACT_APP_MINTSQUARE_URL}/`;
      // single asset
      if (assetType === 'asteroid' && id) {
        url += `asset/${process.env.REACT_APP_MINTSQUARE_MODIFIER}${process.env.REACT_APP_STARKNET_ASTEROID_TOKEN}/${id}`;
      } else if(assetType === 'crewmate' && id) {
        url += `asset/${process.env.REACT_APP_MINTSQUARE_MODIFIER}${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}/${id}`;
      // collection
      } else if (assetType === 'asteroid') {
        url += `collection/${process.env.REACT_APP_MINTSQUARE_MODIFIER}${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}/nfts`;
      } else if (assetType === 'crewmate') {
        url += `collection/${process.env.REACT_APP_MINTSQUARE_MODIFIER}${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}/nfts`;
      // account
      } else if (assetType === 'account') {
        url += `profile/${process.env.REACT_APP_MINTSQUARE_MODIFIER}${process.env.REACT_APP_STARKNET_CREWMATE_TOKEN}/collected`;
      }
      
    } else {
      setMarketplaceDropdownOpen(true);
    }

    if (url) {
      window.open(url, '_blank');
      setMarketplaceDropdownOpen(false);
    }
  }, [assetType, chain, id]);

  return (
    <>
      {children(handleMarketplaceClick, setReferenceEl)}
      {marketplaceDropdownOpen && (
        <MarketplaceSelector
          referenceEl={referenceEl}
          onSelect={handleMarketplaceClick}
          onClose={() => setMarketplaceDropdownOpen(false)} />
      )}
    </>
  );
}

export default MarketplaceLink;