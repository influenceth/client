import CImage from './C-type.svg';
import CiImage from './Ci-type.svg';
import CisImage from './Cis-type.svg';
import CmImage from './Cm-type.svg';
import CmsImage from './Cms-type.svg';
import CsImage from './Cs-type.svg';
import IImage from './I-type.svg';
import MImage from './M-type.svg';
import SImage from './S-type.svg';
import SiImage from './Si-type.svg';
import SmImage from './Sm-type.svg';

const images = [
  <CImage />,
  <CmImage />,
  <CiImage />,
  <CsImage />,
  <CmsImage />,
  <CisImage />,
  <SImage />,
  <SmImage />,
  <SiImage />,
  <MImage />,
  <IImage />
];

const ResourceMix = (props) => {
  const { spectralType } = props;

  return (
    <div {...props}>
      {images[spectralType]}
    </div>
  );
}

export default ResourceMix;
