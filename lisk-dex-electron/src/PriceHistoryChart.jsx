import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatThousands } from './Utils';

const DEFAULT_VOLUME_DISPLAY_HEIGHT_RATIO = 0.2;


const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload) {
    return null;
  }
  return (
    <div className="price-tooltip">
      <p className="time">
        <b>Chain time:</b>
        {' '}
        {formatThousands(`${label}`)}
      </p>
      <p className="price">
        <b>Price:</b>
        {' '}
        {`${formatThousands(payload[0].payload.price)}`}
      </p>
      <p className="volume">
        <b>Volume:</b>
        {' '}
        {`${formatThousands(payload[0].payload.volume)}`}
      </p>
    </div>
  );
};

const TimeAxisTick = ({
  // eslint-disable-next-line no-unused-vars
  x, y, stroke, payload,
}) => (
  <g transform={`translate(${x},${y})`}>
    <text x={38} y={0} dy={16} fontSize="smaller" textAnchor="end" fill="#666">{formatThousands(Number(payload.value))}</text>
  </g>
);

class PriceHistoryChart extends React.PureComponent {
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  render() {
    let volumeDisplayHeightRatio;
    if (this.props.volumeDisplayHeightRatio == null) {
      volumeDisplayHeightRatio = DEFAULT_VOLUME_DISPLAY_HEIGHT_RATIO;
    } else {
      volumeDisplayHeightRatio = this.props.volumeDisplayHeightRatio;
    }
    // TODO: Make graph always fit within its container without using break points.
    let width;
    let height;
    if (this.props.windowWidth > 1599) {
      width = 700;
      height = 380;
    } else if (this.props.windowWidth > 1499) {
      width = 600;
      height = 380;
    } else if (this.props.windowWidth > 1049) {
      width = 380;
      height = 340;
    } else if (this.props.windowWidth > 949) {
      width = 340;
      height = 280;
    } else if (this.props.windowWidth > 729) {
      width = 700;
      height = 250;
    } else if (this.props.windowWidth > 469) {
      width = 400;
      height = 250;
    } else if (this.props.windowWidth > 399) {
      width = 350;
      height = 250;
    } else {
      width = 300;
      height = 200;
    }
    if (this.props.windowWidth > 1000 && this.props.windowHeight < 800) {
      height = 200;
    }
    const maxVolume = this.props.data.reduce((accumulator, entry) => (entry.volume > accumulator ? entry.volume : accumulator), -Infinity);
    const maxPrice = this.props.data.reduce((accumulator, entry) => (entry.price > accumulator ? entry.price : accumulator), -Infinity);

    const assetSymbol = this.props.assets[1].toUpperCase();

    const data = this.props.data.map((entry) => ({
      ...entry,
      Price: entry.price,
      Volume: (entry.volume / maxVolume) * maxPrice * volumeDisplayHeightRatio,
    }));
    return (
      <div style={{ position: 'relative' }}>
        <ComposedChart
          width={width}
          height={height}
          data={data}
          margin={{
            top: 0, right: 0, bottom: 50, left: 10,
          }}
          style={{ position: 'relative', zIndex: 110 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
          <XAxis dataKey="timestamp" tick={<TimeAxisTick />} label={{ value: 'Chain time (seconds)', dy: 30, fill: '#999999' }} />
          <YAxis label={{
            value: `Price (${assetSymbol})`, angle: -90, fill: '#999999', dx: -25,
          }}
          />
          <Tooltip content={<PriceTooltip />} />
          <Bar dataKey="Volume" fill="#999999" />
          <Line type="monotone" dataKey="Price" stroke="#009900" strokeWidth={2} activeDot={{ r: 4 }} dot={null} />
        </ComposedChart>

      </div>
    );
  }
}

export default PriceHistoryChart;
