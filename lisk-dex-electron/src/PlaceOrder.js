import React from "react";
import "./PlaceOrder.css";

export default class PlaceOrder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      price: 0,
      amount: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    console.log(this.state.price);
  }

  render() {
    return (
      <div style={{ padding: "5px" }}>
        <div className="action-name">{this.props.side.toUpperCase()}</div>
        <form onSubmit={this.handleSubmit}>
          Price: <br></br>
          <input name="price" className="order-val-input" type="text" value={this.state.price} onChange={this.handleChange} />
          Amount: <br></br>
          <input name="amount" className="order-val-input" type="text" value={this.state.amount} onChange={this.handleChange} />
          <input className="place-order-button" type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}