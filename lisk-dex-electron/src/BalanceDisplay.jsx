import React from 'react';
import axios from 'axios';
import userContext from './context';
import { formatThousands } from './Utils';
import './App.css';

export default class BalanceDisplay extends React.Component {
  static contextType = userContext;

  interval = undefined;

  constructor(props, context) {
    super(props, context);
    // included in props:
    // asset
    this.state = {
      balance: 0,
    };
  }

  update = () => {
    if (this.context.signedIn === true) {
      const c = axios.create();
      c.defaults.timeout = 10000;
      const targetEndpoint = this.context.configuration.assets[this.props.asset].apiUrl;
      c.get(`${targetEndpoint}/accounts?address=${this.context.keys[this.props.asset].address}`)
        .then((data) => {
          if (data.data.data.length > 0) {
            this.setState({ balance: data.data.data[0].balance });
          }
        });
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    // Note: don't use context for dynamic or frequently changed content.
    // This implementation is a mistake, but I am keeping it as lesson on what not to do.

    if (this.context.signedIn === true && this.props.asset in this.context.keys) {
      if (this.interval === undefined) {
        this.update();
        this.interval = setInterval(this.update, this.context.configuration.refreshInterval);
      }
    } else {
      return <div />;
    }
    return (
      <div style={{ color: '#FFFFFF', marginBottom: '10px' }}>
        Balance:
        {' '}
        <span style={{ fontWeight: 'bold' }}>
          {formatThousands(Math.round((this.state.balance * 100) / this.props.whole) / 100)}
          {' '}
          {this.props.asset.toUpperCase()}
        </span>
      </div>
    );
  }
}
