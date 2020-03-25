import React from "react";
import "./PlaceOrder.css";
import UserOrder from './UserOrder';

export default class YourOrders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
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
  }

  render() {
    return (
      <>
        <div style={{ padding: "5px" }}>
          <div className="action-name">YOUR ORDERS</div>
        </div>
        <div style={{ width: '100%', margin: 0, padding: 0, display: 'flex' }}>
          <div style={{ width: '50%', height: '260px', margin: 0, padding: 0, overflowY: 'scroll' }}>
            {this.props.orders.slice().reverse().map(order => <UserOrder key={order.id} side='bid' order={order}></UserOrder>)}
          </div>
          <div style={{ width: '50%', height: '260px', margin: 0, padding: 0, overflowY: 'scroll' }}>
            {this.props.orders.map(order => <UserOrder key={order.id} side='ask' order={order}></UserOrder>)}
          </div>
        </div>
      </>
    );
  }
}
