import { Crewmate } from '@influenceth/sdk';

import Image1 from '~/assets/images/crew_collections/1.png';
import Image2 from '~/assets/images/crew_collections/2.png';
import Image3 from '~/assets/images/crew_collections/3.png';
import Image4 from '~/assets/images/crew_collections/4.png';

const indexedImages = [
  null, // 1-indexed
  Image1, Image2, Image3, Image4
];

const CrewCollectionEmblem = ({ collection, style = {} }) => {
  const imageSrc = indexedImages[Number(collection)];
  if (imageSrc) {
    const collectionLabel = Crewmate.getCollection(collection)?.name || '';
    return (
      <img
        alt={collectionLabel}
        title={collectionLabel}
        src={imageSrc}
        style={style} />
    );
  }
  return null;
};

export default CrewCollectionEmblem;