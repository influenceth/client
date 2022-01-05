import { useEffect, useState, useRef } from 'react';
import {
  VictoryChart,
  VictoryVoronoiContainer,
  VictoryTooltip,
  VictoryArea,
  VictoryAxis,
  VictoryTheme,
  VictoryScatter
} from 'victory';
import { Vector3 } from 'three';
import numeral from 'numeral';
import styled from 'styled-components';
import { KeplerianOrbit, START_TIMESTAMP } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import useAsteroid from '~/hooks/useAsteroid';
import Details from '~/components/Details';
import AsteroidDataCard from '~/components/AsteroidDataCard';
import DimensionMetric from '~/components/DimensionMetric';
import axisImage from '~/assets/images/semi-major-axis.png';
import inclinationImage from '~/assets/images/inclination.png';
import constants from '~/lib/constants';
import theme from '~/theme';

const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const StyledRouteDetails = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 15px;
  height: calc(100% - 5px);

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: auto;
    padding: 0;
    margin-top: 15px;
  }
`;

const Info = styled.div`
  display: flex;
  flex: 1 0 0;
  justify-content: center;
  width: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex-direction: column;
  }
`;

const AsteroidInfo = styled.div`
  display: flex;
  flex: 1 0 33%;
  flex-direction: column;
  padding-bottom: 35px;

  & h3 {
    background-color: ${p => p.theme.colors.contentHighlight};
    border-top: 1px solid ${p => p.theme.colors.mainBorder};
    border-left: 1px solid ${p => p.theme.colors.mainBorder};
    border-right: 1px solid ${p => p.theme.colors.mainBorder};
    border-radius: 3px 3px 0 0 ;
    color: ${p => p.theme.colors.secondaryText};
    margin: 0;
    padding: 25px;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: 0 15px;
  }
`;

const AsteroidInfoData = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  overflow-y: auto;
  padding: 25px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1 1 auto;
  }
`;

const OrbitalMetrics = styled.div`
  display: flex;
  flex: 1 1 0;
  justify-content: space-between;
  min-height: 150px;
`;

const StyledDimensionMetric = styled(DimensionMetric)`
  align-items: center;
  display: flex;
  flex: 0 0 45%;
  flex-direction: column;
  justify-content: center;
  max-width: 45%;

  @media (max-width: 1500px) {
    & > div {
      font-size: 14px;
    }
  }
`;

const RouteInfo = styled.div`
  display: flex;
  flex: 0 1 33%;
  flex-direction: column;
  height: 100%;
`;

const RouteMetrics = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 50%;
  flex-direction: column;
  height: 50%;
  justify-content: flex-end;
  padding: 0 10px 25px;
  white-space: nowrap;

  & h3 {
    color: ${p => p.theme.colors.secondaryText};
    font-weight: normal;
    margin: 0 0 10px 0;
  }

  & span {
    color: ${p => p.theme.colors.mainText};
    font-size: ${p => p.theme.fontSizes.featureText};
  }
`;

const RouteLines = styled.div`
  border-top: 2px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  flex: 0 0 50%;
  position: relative;

  & div.right {
    border-left: 1px solid ${p => p.theme.colors.mainBorder};
    bottom: -1px;
    height: 100%;
    position: relative;
    width: 50%;
  }

  & div.left {
    border-right: 1px solid ${p => p.theme.colors.mainBorder};
    bottom: -1px;
    height: 100%;
    position: relative;
    width: 50%;
  }
`;

const Ship = styled.svg`
  fill: ${p => p.theme.colors.main};
  height: 40px;
  left: calc(50% - 8px);
  position: absolute;
  top: -20px;
  transform: rotate(-90deg);
  width: auto;
  z-index: 1;
`;

const StyledChart = styled.div`
  flex: 0 0 33%;
`;

const RouteDetails = (props) => {
  const { isMobile } = useScreenSize();
  const time = useStore(s => s.time.current);
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const [ routeUpdated, setRouteUpdated ] = useState(true);
  const [ distances, setDistances ] = useState({});
  const [ data, setData ] = useState([]);
  const [ now, setNow ] = useState([]);
  const [ metrics, setMetrics ] = useState({});
  const [ chartDimensions, setChartDimensions ] = useState();
  const detailsEl = useRef();

  useEffect(() => {
    if (!origin || !destination) return;

    const originOrbit = new KeplerianOrbit(origin.orbital);
    const destOrbit = new KeplerianOrbit(destination.orbital);
    const originVec = new Vector3();
    const destVec = new Vector3();
    const newDistances = {};
    const numPoints = 500;
    const step = 10;

    // Time hasn't changed don't recalculate
    if (!routeUpdated && now[0]?.x === time - (time % step) - diff) return;

    for (let i = -numPoints / 2; i <= numPoints / 2; i++) {
      const calcTime = time - (time % step) + (i * step);

      if (!routeUpdated && distances[calcTime] && i !== 0) {
        newDistances[calcTime] = distances[calcTime];
      } else {
        originVec.fromArray(Object.values(originOrbit.getPositionAtTime(calcTime)));
        destVec.fromArray(Object.values(destOrbit.getPositionAtTime(calcTime)));
        newDistances[calcTime] = { x: calcTime - diff, y:  constants.AU * originVec.distanceTo(destVec) / 1000 };
      }

      if (i === 0) {
        const newMetrics = {
          origin: {
            plane: constants.AU * originVec.z / 1000,
            radius: constants.AU * originVec.length() / 1000,
          },
          dest: {
            plane: constants.AU * destVec.z / 1000,
            radius: constants.AU * destVec.length() / 1000,
          }
        };

        setMetrics(newMetrics);
        setNow([ newDistances[calcTime] ]);
      }

      if (routeUpdated) setRouteUpdated(false);
    }

    setDistances(newDistances);
    setData(Object.values(newDistances));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ origin, destination, time ]);

  useEffect(() => {
    setRouteUpdated(true);
  }, [ originId, destinationId ]);

  // Use screen size to resize chart
  useEffect(() => {
    const handleResize = () => {
      if (!detailsEl?.current) return;
      const height = isMobile ? 400 : detailsEl.current.clientHeight / 3;
      setChartDimensions({ height: height, width: detailsEl.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Details title="Route Details">
      <StyledRouteDetails ref={detailsEl} >
        <Info>
          <AsteroidInfo>
            <h3>Origin: {origin ? origin.customName || origin.baseName : ''}</h3>
            <AsteroidInfoData>
              {!origin && <span>Select an origin asteroid...</span>}
              {origin && (
                <>
                  <AsteroidDataCard asteroid={origin} />
                  <OrbitalMetrics>
                    <StyledDimensionMetric
                      image={axisImage}
                      label="Distance from Adalia"
                      text={`${numeral(metrics.origin?.radius).format('0,0')} km` || '... km'} />
                    <StyledDimensionMetric
                      image={inclinationImage}
                      label="Distance from Plane"
                      text={`${numeral(metrics.origin?.plane).format('0,0')} km` || '... km'} />
                  </OrbitalMetrics>
                </>
              )}
            </AsteroidInfoData>
          </AsteroidInfo>
          <RouteInfo>
            <RouteMetrics>
              <h3>Current Distance:</h3>
              <span>{numeral(now[0]?.y).format('0,0') || '...'} km</span>
            </RouteMetrics>
            {!isMobile && (
              <RouteLines>
                <Ship xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.467 19.844">
                  <path d="M4.233 19.844l4.233-9.929V0L5.712 6.398l-1.479-2.03-1.479 2.03L0 0v9.914z">
                  </path>
                </Ship>
                <div className="left"/>
                <div className="right"/>
              </RouteLines>
            )}
          </RouteInfo>
          <AsteroidInfo>
            <h3>Destination: {destination ? destination.customName || destination.baseName: ''}</h3>
            <AsteroidInfoData>
              {!destination && <span>Select a destination asteroid...</span>}
              {destination && (
                <>
                  <AsteroidDataCard asteroid={destination} />
                  <OrbitalMetrics>
                    <StyledDimensionMetric
                      image={axisImage}
                      label="Distance from Adalia"
                      text={`${numeral(metrics.dest?.radius).format('0,0')} km` || '... km'} />
                    <StyledDimensionMetric
                      image={inclinationImage}
                      label="Distance from Plane"
                      text={`${numeral(metrics.dest?.plane).format('0,0')} km` || '... km'} />
                  </OrbitalMetrics>
                </>
              )}
            </AsteroidInfoData>
          </AsteroidInfo>
        </Info>
        <StyledChart>
          <VictoryChart
            containerComponent={
              <VictoryVoronoiContainer
                labels={({ datum }) => {
                  const days = datum.x - time + diff;
                  return `${days > 0 ? '+' : ''}${numeral(days).format('0,0')} days`;
                }}
                labelComponent={
                  <VictoryTooltip
                    constrainToVisibleArea
                    flyoutStyle={{
                      fill: '#444',
                      stroke: 'none'
                    }}
                    style={{
                      fill: theme.colors.mainText,
                      fontFamily: 'Jura'
                    }} />
                }
                voronoiDimension="x" />
            }
            domainPadding={{ y: [ 0, 20 ] }}
            height={chartDimensions?.height || 500}
            minDomain={{ y: 0 }}
            padding={{ top: 0, right: 0, bottom: 30, left: 0 }}
            theme={VictoryTheme.material}
            width={chartDimensions?.width || 1000}>
            <defs>
              <linearGradient id="gradient-fill" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0" stop-color="#36a7cd" />
                <stop offset="0.14285714285714285" stop-color="#00a2dc" />
                <stop offset="0.2857142857142857" stop-color="#009beb" />
                <stop offset="0.42857142857142855" stop-color="#0093f8" />
                <stop offset="0.5714285714285714" stop-color="#0088ff" />
                <stop offset="0.7142857142857142" stop-color="#007bff" />
                <stop offset="0.8571428571428571" stop-color="#5669ff" />
                <stop offset="1" stop-color="#884fff" />
              </linearGradient>
            </defs>
            <VictoryAxis
              dependentAxis
              offsetX={(chartDimensions?.width - 1) / 2 || 0}
              tickFormat={(t) => numeral(t).format('0a') + ' km'}
              style={{
                axis: {
                  stroke: theme.colors.mainBorder,
                  strokeWidth: '2px'
                },
                grid: {
                  stroke: 'none',
                  strokeDasharray: 'none'
                },
                ticks: {
                  stroke: 'none'
                },
                tickLabels: {
                  fill: theme.colors.secondaryText,
                  fontFamily: 'Jura'
                }
              }} />
            {data && (
              <VictoryArea
                data={data}
                style={{
                  data: {
                    fill: 'url(#gradient-fill)',
                    fillOpacity: 0.1,
                    stroke: theme.colors.main,
                    strokeWidth: '2px'
                  }
                }} />
            )}
            <VictoryAxis
              tickFormat={(t) => `${t.toLocaleString()} days`}
              style={{
                axis: {
                  stroke: theme.colors.mainBorder
                },
                axisLabel: {
                  fill: theme.colors.secondaryText,
                  fontFamily: 'Jura'
                },
                grid: {
                  stroke: 'none'
                },
                ticks: {
                  stroke: 'none'
                },
                tickLabels: {
                  fill: theme.colors.secondaryText,
                  fontFamily: 'Jura'
                }
              }} />
              {now && (
                <VictoryScatter
                  data={now}
                  size={4}
                  style={{
                    data: {
                      fill: 'black',
                      stroke: theme.colors.main,
                      strokeWidth: '2px'
                    }
                  }} />
              )}
          </VictoryChart>
        </StyledChart>
      </StyledRouteDetails>
    </Details>
  )
};

export default RouteDetails;
