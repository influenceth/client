import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Entity } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useCreateReferral from '~/hooks/useCreateReferral';
import useNameAsteroid from '~/hooks/useNameAsteroid';
import constants from '~/lib/constants';
import formatters from '~/lib/formatters';
import exportGLTF from '~/lib/graphics/exportGLTF';

import AddressLink from '~/components/AddressLink';
import Button from '~/components/ButtonAlt';
import DataReadout from '~/components/DataReadout';
import Ether from '~/components/Ether';
import IconButton from '~/components/IconButton';
import LogEntry from '~/components/LogEntry';
import MarketplaceLink from '~/components/MarketplaceLink';
import StaticForm from '~/components/StaticForm';
import Text from '~/components/Text';
import TextInput from '~/components/TextInput';
import {
  CheckCircleIcon,
  EccentricityIcon,
  EditIcon,
  InclinationIcon,
  OrbitalPeriodIcon,
  RadiusIcon,
  SemiMajorAxisIcon,
  SurfaceAreaIcon
} from '~/components/Icons';
import { renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import AsteroidGraphic from './components/AsteroidGraphic';
import useNameAvailability from '~/hooks/useNameAvailability';
import { boolAttr } from '~/lib/utils';
import usePriceConstants from '~/hooks/usePriceConstants';
import useControlAsteroid from '~/hooks/useControlAsteroid';

const paneStackBreakpoint = 720;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-right: 4px;
  & > div {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  @media (max-width: ${paneStackBreakpoint}px) {
    display: block;
    height: auto;
    & > div {
      height: auto;
    }
  }
`;
const LeftPane = styled.div`
  flex: 0 1 540px;
  overflow: hidden;
  padding-top: 30px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1;
  }
`;
const RightPane = styled.div`
  flex: 2;
  margin-left: 30px;
  padding-top: 40px;
  & > div:first-child {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1;
  }

  @media (max-width: ${p => paneStackBreakpoint}px) {
    margin-left: 0;
    & > div:first-child {
      flex: 0;
    }
  }
`;

const SectionHeader = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.borderBottom};
  color: white;
  font-size: 125%;
  padding-bottom: 4px;
`;

const SectionBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  overflow: hidden;
  position: relative;
  @media (max-width: ${paneStackBreakpoint}px) {
    overflow: visible;
  }
`;

const GraphicSection = styled.div`
  flex: 1;
  min-height: 150px;
  @media (max-width: ${paneStackBreakpoint}px) {
    min-height: unset;
  }
`;
const GraphicWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
`;

const Attributes = styled.div`
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: -12px;
  & > div {
    align-items: center;
    display: flex;
    border-bottom: 1px solid ${p => p.theme.colors.borderBottomAlt};
    margin-bottom: 12px;
    max-width: 48%;
    padding: 6px 0;
    width: 360px;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 150%;
      margin-right: 10px;
    }
    & > label {
      flex: 1;
      white-space: nowrap;
    }
    & > span {
      color: white;
      white-space: nowrap;
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background: transparent;
  }
  @media (min-width: 800px) and (max-width: 1140px) {
    & > div {
      & > label { display: none; }
      & > span { flex: 1; text-align: center; }
    }
  }
  @media (min-width: ${paneStackBreakpoint + 1}px) and (max-width: 799px) {
    & > div {
      max-width: none;
      width: 100%;
    }
  }
  @media (max-width: 520px) {
    & > div {
      max-width: none;
      width: 100%;
    }
  }
`;

const ModelButton = styled(Button)`
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const HighlightOwnership = styled.div`
  font-size: 115%;
  font-weight: bold;
  color: ${p => p.warning ? p.theme.colors.warning : p.theme.colors.main};
  margin-top: 0.25em;
  margin-bottom: 1.25em;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  & > button {
    flex: 1;
    max-width: 250px;
    white-space: nowrap;
    &:not(:first-child) {
      margin-left: 6px;
    }
  }
`;

// TODO: componentize this (shared w/ crewmatedetails)
const breakpoint = 1375;
const LogHeader = styled.ul``;
const Log = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  & ul {
    display: flex;
    flex-direction: column-reverse;
    list-style-type: none;
    margin: 0;
    padding: 5px 0;
  }
  & ${LogHeader} {
    @media (max-width: ${breakpoint}px) {
      display: none;
    }
  }

  & > div {
    border-top: 1px solid ${p => p.theme.colors.borderBottomAlt};
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    & ul {
      margin-right: -5px;
      padding-top: 16px;
      @media (max-width: ${breakpoint}px) {
        margin-right: 0;
      }
    }

    @media (max-width: ${breakpoint}px) {
      border-top: none;
      height: auto;
      max-height: calc(100vh - 200px);
    }
  }

  @media (max-width: ${breakpoint}px) {
    display: block;
    margin: 0 -10px;
  }
`;
const EmptyLogEntry = styled.li`
  padding-top: 50px;
  text-align: center;
`;

const NameForm = styled.div`
  display: flex;
  & input {
    margin-right: 10px;
  }
`;

const SmHidden = styled.span`
  display: inline;
  @media (max-width: 1300px) {
    display: none;
  }
`;


const AsteroidInformation = ({ abundances, asteroid, isManager, isOwner }) => {
  const { account } = useAuth();
  const createReferral = useCreateReferral(Number(asteroid.id));
  const isNameValid = useNameAvailability(Entity.IDS.ASTEROID);
  const { buyAsteroid, buying } = useBuyAsteroid(Number(asteroid.id));
  const { controlAsteroid, takingControl } = useControlAsteroid(Number(asteroid.id));
  const { nameAsteroid, naming } = useNameAsteroid(Number(asteroid.id));
  const { data: priceConstants } = usePriceConstants();
  const webWorkerPool = useWebWorker();

  const [exportingModel, setExportingModel] = useState(false);
  const [newName, setNewName] = useState('');
  const [openNameChangeForm, setOpenNameChangeForm] = useState(false);

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;
    setExportingModel(true);
    renderDummyAsteroid(asteroid, constants.MODEL_EXPORT_RESOLUTION, webWorkerPool, (asteroidModel, dispose) => {
      exportGLTF(asteroidModel, `asteroid_${asteroid.id}`, () => {
        try {
          dispose();
        } catch (e) { console.warn(e); }
        setExportingModel(false);
      });
    });
  }, [asteroid, exportingModel, webWorkerPool]);

  // on asteroid change, reset name input field on asteroid change
  useEffect(() => {
    setNewName('');
    setOpenNameChangeForm(false);
  }, [asteroid.Name?.name]);

  const attemptUpdateAsteroidName = useCallback(async () => {
    if (await isNameValid(newName)) {
      nameAsteroid(newName);
    }
  }, [nameAsteroid, isNameValid, newName]);

  return (
    <Wrapper>
      <LeftPane>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Asteroid ID#">{asteroid.id}</DataReadout>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Owner">
          <AddressLink address={asteroid.Nft?.owner} chain={asteroid.Nft?.chain} />
        </DataReadout>
        <GraphicSection>
          <GraphicWrapper>
            <AsteroidGraphic
              abundances={abundances}
              asteroid={asteroid}
              noColor={asteroid.Celestial.scanStatus < Asteroid.SCAN_STATUSES.SURFACE_SCANNED}
              noGradient />
          </GraphicWrapper>
        </GraphicSection>

        <SectionBody>
          <Attributes>
            <div>
              <OrbitalPeriodIcon />
              <label>Orbital Period</label>
              <span>{formatters.period(asteroid.Orbit)}</span>
            </div>
            <div>
              <InclinationIcon />
              <label>Inclination</label>
              <span>{formatters.inclination(asteroid.Orbit.inc)}</span>
            </div>
            <div>
              <SemiMajorAxisIcon />
              <label>Semi-Major Axis</label>
              <span>{formatters.axis(asteroid.Orbit.a)}</span>
            </div>
            <div>
              <EccentricityIcon />
              <label>Eccentricity</label>
              <span>{asteroid.Orbit.ecc}</span>
            </div>
            <div>
              <RadiusIcon />
              <label>Diameter</label>
              <span>{formatters.radius(asteroid.Celestial.radius * 2)}</span>
            </div>
            <div>
              <SurfaceAreaIcon />
              <label>Surface Area</label>
              <span>{formatters.surfaceArea(asteroid.Celestial.radius)}</span>
            </div>
          </Attributes>
        </SectionBody>
      </LeftPane>

      <RightPane>
        <div>
          <SectionHeader>Asteroid Log</SectionHeader>
          <SectionBody>
            <Log>
              <LogHeader>
                <LogEntry isHeaderRow isTabular css={{ fontSize: '14px' }} />
              </LogHeader>
              <div>
                <ul>
                  {asteroid.events?.length > 0
                    ? asteroid.events.map(e => (
                      <LogEntry
                        key={e.id}
                        css={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 4px' }}
                        data={{ ...e, i: asteroid.i }}
                        timestampBreakpoint="1400px"
                        type={`Asteroid_${e.event}`}
                        isTabular />
                    ))
                    : <EmptyLogEntry>No logs recorded yet.</EmptyLogEntry>
                  }
                </ul>
              </div>
            </Log>
          </SectionBody>
        </div>

        <div>
          <SectionHeader>Management</SectionHeader>
          <SectionBody>
            {isOwner && !isManager && <HighlightOwnership warning>You own this Asteroid, but your crew does not currently manage it.</HighlightOwnership>}
            {isManager && <HighlightOwnership>Your crew manages this Asteroid.</HighlightOwnership>}
            <ButtonRow>
              {isManager && (
                <>
                  <StaticForm
                    css={{
                      bottom: 1,
                      height: openNameChangeForm ? 'calc(100% - 10px)' : 0,
                      left: 0,
                      opacity: openNameChangeForm ? 1 : 0,
                      position: 'absolute',
                      width: openNameChangeForm ? '100%' : 0,
                      transition: 'height 300ms ease, opacity 300ms ease, width 300ms ease',
                      zIndex: 1
                    }}
                    onClose={() => setOpenNameChangeForm(false)}
                    title={<><EditIcon /><span>Change Name</span></>}
                    loading={boolAttr(naming)}>
                    <Text>Names must be unique, and can only include letters, numbers, and single spaces.</Text>
                    <NameForm>
                      <TextInput
                        disabled={boolAttr(naming)}
                        initialValue=""
                        maxlength={31}
                        pattern="^(([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+){1,31}$"
                        onChange={(v) => setNewName(v)} />
                      <IconButton
                        data-tip="Submit"
                        data-for="global"
                        disabled={boolAttr(naming)}
                        onClick={attemptUpdateAsteroidName}>
                        <CheckCircleIcon />
                      </IconButton>
                    </NameForm>
                  </StaticForm>
                  <Button
                    disabled={boolAttr(naming)}
                    isTransaction
                    loading={boolAttr(naming)}
                    onClick={() => setOpenNameChangeForm(true)}>
                    Re-Name
                  </Button>
                </>
              )}

              {isOwner && !isManager && (
                <Button
                  disabled={boolAttr(takingControl)}
                  isTransaction
                  loading={boolAttr(takingControl)}
                  onClick={controlAsteroid}>
                  Manage Asteroid
                </Button>
              )}

              {isOwner && (
                <ModelButton
                  disabled={boolAttr(exportingModel)}
                  loading={boolAttr(exportingModel)}
                  onClick={download3dModel}>
                  <><SmHidden>Download{' '}</SmHidden><span>3D Model</span></>
                </ModelButton>
              )}

              {priceConstants && !asteroid.Nft?.owner && (
                <Button
                  data-tip="Purchase development rights"
                  data-for="global"
                  disabled={boolAttr(!account || buying)}
                  isTransaction
                  loading={boolAttr(buying)}
                  onClick={() => {
                    buyAsteroid();
                    createReferral.mutate();
                  }}>
                  Purchase -&nbsp;<Ether>{formatters.asteroidPrice(asteroid.Celestial.radius, priceConstants)}</Ether>
                </Button>
              )}
              {asteroid.Nft?.owner && (
                <MarketplaceLink
                  chain={asteroid.Nft?.chain}
                  assetType="asteroid"
                  id={asteroid.i}>
                  {(onClick, setRefEl) => (
                    <Button setRef={setRefEl} onClick={onClick}>
                      {isOwner ? <><span>List</span><SmHidden>{' '}for Sale</SmHidden></> : 'Purchase'}
                    </Button>
                  )}
                </MarketplaceLink>
              )}
            </ButtonRow>
          </SectionBody>
        </div>
      </RightPane>
    </Wrapper>
  );
};

export default AsteroidInformation;