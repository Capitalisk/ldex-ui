import React from "react";
import axios from 'axios';
import { userContext } from './context';
import "./App.css";
import { DEXConfiguration } from "./util/Configuration";

export default class BalanceDisplay extends React.Component<any, any> {
  static contextType = userContext;
  interval = undefined;
  constructor(props, context) {
    super(props, context);
    // included in props:
    // asset
    this.state = {
      'balance': 0
    };
    const config = (context.configuration as DEXConfiguration);

    this.blockchainAPIURLs = {
      [context.currentMarket[0]]: config.markets[context.activeMarket].LISK_API_URLS[context.currentMarket[0]],
      [context.currentMarket[1]]: config.markets[context.activeMarket].LISK_API_URLS[context.currentMarket[1]],
    }
  }
  blockchainAPIURLs = {}

  update = () => {
    if (this.context.signedIn === true) {
      console.log('Updating balance');
      const c = axios.create();
      c.defaults.timeout = 10000;
      c.get(`${this.blockchainAPIURLs[this.props.asset][0]}/accounts?address=${this.context.keys[this.props.asset].address}`)
        .then((data) => {
          // "data" :))
          if (data.data.data.length > 0) {
            this.setState({ 'balance': data.data.data[0].balance });
          }
        });
    }
  }

  render() {
    // Note: don't use context for dynamic or frequently changed content.
    // This implementation is a mistake, but I am keeping it as lesson on what not to do.
    if (this.context.signedIn === true && this.props.asset in this.context.keys) {
      if (this.interval === undefined) {
        // console.log('SETTING INTERVAL');
        this.update();
        this.interval = setInterval(this.update, 10000);
      }
    } else {
      return <div></div>;
    }
    return (
      <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>Bal: {this.state.balance / this.props.whole} {this.props.asset.toUpperCase()}</div>
    );
  }
}
