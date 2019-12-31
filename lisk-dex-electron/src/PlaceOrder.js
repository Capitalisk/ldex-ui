import React from "react";
import "./PlaceOrder.css";

export default class PlaceOrder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <>
        <div style={{ padding: "5px" }}>
          <div className="action-name">{this.props.side.toUpperCase()}</div>
          <form>
            Price: <br></br>
            <input className="order-val-input" type="text" value={this.state.value} onChange={this.handleChange} />
            Amount: <br></br>
            <input className="order-val-input" type="text" value={this.state.value} onChange={this.handleChange} />
            <input className="place-order-button" type="submit" value="Submit" />
          </form>
        </div>
      </>
    );
  }
}
