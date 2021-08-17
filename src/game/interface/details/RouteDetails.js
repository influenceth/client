import { useEffect, useLayoutEffect, useState, useRef } from 'react';
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
import useAsteroid from '~/hooks/useAsteroid';
import Details from '~/components/Details';
import AsteroidDataCard from '~/components/AsteroidDataCard';
import constants from '~/lib/constants';
import theme from '~/theme';

const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const StyledRouteDetails = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 15px;
  height: 100%;
`;

const Info = styled.div`
  display: flex;
  flex: 1 0 auto;
  justify-content: center;
  width: 100%;
`;

const AsteroidInfo = styled.div`
  display: flex;
  flex: 0 0 33%;
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
    padding: 25px 15px;
  }
`;

const StyledAsteroidDataCard = styled(AsteroidDataCard)`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  flex: 1 0 auto;
  padding: 15px;
`;

const RouteInfo = styled.div`
  display: flex;
  flex: 0 0 33%;
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
  padding-bottom: 25px;

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
  const time = useStore(s => s.time.current);
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const [ distances, setDistances ] = useState({});
  const [ data, setData ] = useState([]);
  const [ now, setNow ] = useState([]);
  const [ chartDimensions, setChartDimensions ] = useState();
  const detailsEl = useRef();

  useEffect(() => {
    if (!origin || !destination) return;

    const originOrbit = new KeplerianOrbit(origin.orbital);
    const destOrbit = new KeplerianOrbit(destination.orbital);
    const originVec = new Vector3();
    const destVec = new Vector3();
    const newDistances = {};
    const numPoints = 250;
    const step = 20;

    for (let i = -numPoints / 2; i <= numPoints / 2; i++) {
      const calcTime = time - (time % step) + (i * step);

      if (distances[calcTime]) {
        newDistances[calcTime] = distances[calcTime];
      } else {
        originVec.fromArray(Object.values(originOrbit.getPositionAtTime(calcTime)));
        destVec.fromArray(Object.values(destOrbit.getPositionAtTime(calcTime)));
        newDistances[calcTime] = { x: calcTime - diff, y:  constants.AU * originVec.distanceTo(destVec) / 1000 };
      }

      if (i === 0) setNow([ newDistances[calcTime] ]);
    }

    setDistances(newDistances);
    setData(Object.values(newDistances));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ origin, destination, time ]);

  useLayoutEffect(() => {
    setChartDimensions({ height: detailsEl.current.clientHeight / 3, width: detailsEl.current.clientWidth });
  }, []);

  return (
    <Details title="Route Details">
      <StyledRouteDetails ref={detailsEl} >
        <Info>
          {origin && (
            <AsteroidInfo>
              <h3>Origin: {origin.customName || origin.baseName}</h3>
              <StyledAsteroidDataCard asteroid={origin} />
            </AsteroidInfo>
          )}
          <RouteInfo>
            <RouteMetrics>
              <h3>Current Distance:</h3>
              <span>{numeral(now[0]?.y).format('0,0') || '...'} km</span>
            </RouteMetrics>
            <RouteLines>
              <Ship xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.467 19.844">
                <path d="M4.233 19.844l4.233-9.929V0L5.712 6.398l-1.479-2.03-1.479 2.03L0 0v9.914z">
                </path>
              </Ship>
              <div className="left"/>
              <div className="right"/>
            </RouteLines>
          </RouteInfo>
          {destination && (
            <AsteroidInfo>
              <h3>Destination: {destination.customName || destination.baseName}</h3>
              <StyledAsteroidDataCard asteroid={destination} />
            </AsteroidInfo>
          )}
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
              offsetX={chartDimensions?.width / 2 || 0}
              tickFormat={(t) => numeral(t).format('0a') + ' km'}
              style={{
                axis: {
                  stroke: theme.colors.mainBorder
                },
                grid: {
                  stroke: '#111',
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
