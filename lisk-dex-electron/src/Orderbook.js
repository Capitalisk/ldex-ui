import React from "react";
import SingleOrder from "./SingleOrder";
import { getOrderbook } from "./API";
import "./Orderbook.css";

export default class Orderbook extends React.Component {
  constructor(props) {
    super(props);
    this.state = { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } };
    /*
      Schema of the orders element:
      {
          amount: size of the order
          price: price at which the order is
      }

      Orders at the same price will be merged.
      */
  }

  refreshOrderbook() {
    getOrderbook().then(results => {
      const bids = [];
      const asks = [];
      let maxSize = { bid: 0, ask: 0 };
      for (let result of results.data) {
        if (result.side === "bid") {
          bids.push(result);
          if (result.size > maxSize.bid) {
            maxSize.bid = result.size;
          }
        } else if (result.side === "ask") {
          asks.push(result);
          if (result.size > maxSize.ask) {
            maxSize.ask = result.size;
          }
        }
      }
      this.setState({ bids, asks, maxSize });
    });
  }

  componentDidMount() {
    this.refreshOrderbook();
  }

  render() {
    if (this.props.side === "asks") {
      const orders = this.state.asks.map(order => (
        <SingleOrder
          whole={Math.pow(10, 8)} // 10 ** 8 beddow in one LSK
          key={order.orderId}
          size={order.size}
          price={order.price}
          maxSize={this.state.maxSize}
          side={this.props.side}
          decimals={4}
        ></SingleOrder>
      ));
      return <div className="askOrderList">{orders}</div>;
    }
    if (this.props.side === "bids") {
      const orders = this.state.bids.map(order => (
        <SingleOrder
          whole={Math.pow(10, 8)} // 10 ** 8 beddow in one LSK
          key={order.orderId}
          size={order.size}
          price={order.price}
          maxSize={this.state.maxSize}
          side={this.props.side}
          decimals={4}
        ></SingleOrder>
      ));
      return <div className="bidOrderList">{orders}</div>;
    }
  }
}
