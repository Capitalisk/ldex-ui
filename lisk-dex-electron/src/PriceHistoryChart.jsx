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
        {(new Date(label)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' })}
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
}) => {
  let date = new Date(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={38} y={0} dy={16} fontSize="smaller" textAnchor="end" fill="#666">{`${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}</text>
    </g>
  );
};

class PriceHistoryChart extends React.PureComponent {
  constructor(props, context) {
    super(props, context);
    this.state = {
      chartSizes: {
        height: 0,
        width: 0,
      },
    };
  }

  chartReSize(chartElement) {
    this.setState((s) => ({
      ...s,
      chartSizes: {
        height: chartElement.offsetHeight - 50,
        width: chartElement.offsetWidth - 50,
      },
    }));
  }

  componentDidMount() {
    const chartElement = document.querySelector('.price-chart');
    this.chartReSize(chartElement);
    window.addEventListener('resize', () => {
      this.chartReSize(chartElement);
    });
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.chartSizes);
  }

  render() {
    let volumeDisplayHeightRatio;
    if (this.props.volumeDisplayHeightRatio == null) {
      volumeDisplayHeightRatio = DEFAULT_VOLUME_DISPLAY_HEIGHT_RATIO;
    } else {
      volumeDisplayHeightRatio = this.props.volumeDisplayHeightRatio;
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
          width={this.state.chartSizes.width}
          height={this.state.chartSizes.height}
          data={data}
          margin={{
            top: 0, right: 0, bottom: 50, left: 10,
          }}
          style={{ position: 'relative', zIndex: 110 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
          <XAxis dataKey="baseTimestamp" tick={<TimeAxisTick />} label={{ value: 'Date', dy: 30, fill: '#999999' }} />
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
