import { useCallback, useState, } from 'react';

const MarketplaceLink = ({ assetType, chain, children, id }) => {
  const [referenceEl, setReferenceEl] = useState();

  const handleMarketplaceClick = useCallback(() => {
    let url;

    // Ethereum > OpenSea
    if (chain === 'ETHEREUM') {
      url = `${process.env.REACT_APP_ETHEREUM_NFT_MARKET_URL}/`;
      // single asset
      if (assetType === 'asteroid' && id) {
        url += `assets/${process.env.REACT_APP_CONTRACT_ASTEROID_TOKEN}/${id}`;
      } else if(assetType === 'crewmate' && id) {
        // TODO: swap to v2 once enough crewmates have been bridged
        // Message on OpenSea also directs to other contract
        url += `assets/${process.env.REACT_APP_CONTRACT_CREWMATE_TOKEN}/${id}`;
      // collection (NOTE: these are not used currently)
      } else if (assetType === 'asteroid') {
        url += `influenceth-asteroids`;
      } else if (assetType === 'crewmate') {
        url += `influence-crew`;
      // account
      } else if (assetType === 'account') {
        url += `${id}`;
      }

    // Starknet > Unframed
    } else if (chain === 'STARKNET') {
      url = `${process.env.REACT_APP_STARKNET_NFT_MARKET_URL}/`;
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
        url += `profile/${id}`;
      }
    }

    if (url) window.open(url, '_blank');
  }, [assetType, chain, id]);

  return (
    <>
      {children(handleMarketplaceClick, setReferenceEl)}
    </>
  );
}

export default MarketplaceLink;