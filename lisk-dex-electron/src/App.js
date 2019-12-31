import React from "react";
import Orderbook from "./Orderbook";
import Chart from "./Chart";
import PlaceOrder from "./PlaceOrder";
import YourOrders from "./YourOrders";
import { getOrderbook } from "./API";
import "./App.css";
import MarketList from "./MarketList";

class App extends React.Component {
  constructor(props) {
    super(props);
    // This state has too many members. This is because we want to share data from API calls with various different components without
    // having to re-fetch the data in each.
    this.state = {
      orderBookData: { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } },
      currentMarket: ["clsk", "lsk"],
      currentMaxBid: 0,
    };
  }

  refreshOrderbook() {
    getOrderbook().then(results => {
      const bids = [];
      const asks = [];
      let maxSize = { bid: 0, ask: 0 };
      let currentMaxBid = 0;
      for (let result of results.data) {
        if (
          // filter for the turrent trading pair.
          (result.targetChain === this.state.currentMarket[0] || result.sourceChain === this.state.currentMarket[0]) &&
          (result.targetChain === this.state.currentMarket[1] || result.sourceChain === this.state.currentMarket[1])
        ) {
          if (result.side === "bid") {
            bids.push(result);
            if (result.size > maxSize.bid) {
              maxSize.bid = result.sizeRemaining;
            }
          } else if (result.side === "ask") {
            asks.push(result);
            if (result.size > maxSize.ask) {
              maxSize.ask = result.sizeRemaining;
            }
          }
        }
      }
      currentMaxBid = bids[bids.length - 1].price;
      this.setState({ orderBookData: { bids, asks, maxSize }, currentMaxBid });
    });
  }

  componentDidMount() {
    this.refreshOrderbook();
  }

  render() {
    console.log(this.state.orderBookData.bids);
    return (
      <>
        <div className="top-bar">
          <div className="top-bar-right">
            <b>Lisk DEX</b>
          </div>
          <div className="top-bar-left">
            API Status: <span style={{ color: "green" }}>Connected</span>. Next refresh in 30 seconds.
          </div>
        </div>
        <div className="container">
          <div className="buy-panel">
            <PlaceOrder side="buy"></PlaceOrder>
          </div>
          <div className="sell-panel">
            <PlaceOrder side="sell"></PlaceOrder>
          </div>
          <div className="orderbook-container">
            <div className="sell-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="asks"></Orderbook>
            </div>
            <div className="price-display">
              Price: {this.state.currentMaxBid} {this.state.currentMarket[1].toUpperCase()} 
            </div>
            <div className="buy-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="bids"></Orderbook>
            </div>
          </div>
          <div className="depth-chart">
            <Chart whole={Math.pow(10, 8)} currentMarket={this.state.currentMarket}></Chart>
          </div>
          <div className="your-orders">
            <YourOrders></YourOrders>
          </div>
          <div className="market-name-and-stats">
            <MarketList></MarketList>
          </div>
        </div>
      </>
    );
  }
}

export default App;
