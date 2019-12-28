import React from "react";

class Orderbook extends React.Component {
    constructor(props) {
      super(props);
      this.state = { orders: [] };
      /*
      Schema of the orders element:
      {
          amount: size of the order
          price: price at which the order is
      }

      Orders at the same price will be merged.
      */ 
    }
  
    componentDidMount() {}
  
    render() {
      return (
        <>
          <div className="top-bar">
            <div className="top-bar-right">
              <b>Lisk DEX</b>
            </div>
            <div className="top-bar-left">
              API Status: <span style={{ color: "green" }}>Connected</span>
            </div>
          </div>
          <div className="container">
            <div className="buy-panel">BUY</div>
            <div className="sell-panel">SELL</div>
            <div className="buy-orders">
              ORDERS TO BUY
              <br></br>
              increasing price top to bottom
            </div>
            <div className="sell-orders">
              ORDERS TO SELL
              <br></br>
              decreasing price top to bottom
            </div>
            <div className="depth-chart">DEPTH CHART / LINES</div>
            <div className="your-orders">YOUR ORDERS</div>
            <div className="market-name-and-stats">
              MRCL/LSK (current market name)
              <br></br>
              <br></br>
              list of other markets
              <br></br>
              <br></br>
              <br></br>
              ect
            </div>
          </div>
        </>
      );
    }
  }