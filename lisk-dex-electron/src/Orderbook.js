import React from "react";
import SingleOrder from "./SingleOrder";
import "./Orderbook.css";

export default class Orderbook extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    if (this.props.side === "asks") {
      const orders = this.props.orderBookData.asks.map(order => (
        <SingleOrder
          whole={Math.pow(10, 8)} // 10 ** 8 beddow in one LSK
          key={order.orderId}
          size={order.sizeRemaining}
          price={order.price}
          maxSize={this.props.orderBookData.maxSize}
          side={this.props.side}
          decimals={4}
        ></SingleOrder>
      ));
      return <div className="askOrderList">{orders}</div>;
    }
    if (this.props.side === "bids") {
      const orders = this.props.orderBookData.bids.map(order => (
        <SingleOrder
          whole={Math.pow(10, 8)} // 10 ** 8 beddow in one LSK
          key={order.orderId}
          size={order.sizeRemaining}
          price={order.price}
          maxSize={this.props.orderBookData.maxSize}
          side={this.props.side}
          decimals={4}
        ></SingleOrder>
      ));
      orders.reverse();
      return <div className="bidOrderList">{orders}</div>;
    }
  }
}
