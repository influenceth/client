import CImage from '~/assets/images/C-type.svg';
import CiImage from '~/assets/images/Ci-type.svg';
import CisImage from '~/assets/images/Cis-type.svg';
import CmImage from '~/assets/images/Cm-type.svg';
import CmsImage from '~/assets/images/Cms-type.svg';
import CsImage from '~/assets/images/Cs-type.svg';
import IImage from '~/assets/images/I-type.svg';
import MImage from '~/assets/images/M-type.svg';
import SImage from '~/assets/images/S-type.svg';
import SiImage from '~/assets/images/Si-type.svg';
import SmImage from '~/assets/images/Sm-type.svg';

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
  const { spectralType, ...restProps } = props;

  return (
    <div {...restProps}>
      {images[spectralType]}
    </div>
  );
}

export default ResourceMix;
