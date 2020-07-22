import React from 'react';
import './PlaceOrder.css';
import UserOrder from './UserOrder';

const statusValues = {
  pending: 0,
  processing: 1,
  canceling: 2,
  matching: 2,
  ready: 2,
};

export default class YourOrders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
  }

  handleCancel = (order) => {
    this.props.orderCanceled(order);
  }

  handleCancelFail = (error) => {
    this.props.handleCancelFail(error);
  }

  render() {
    const orders = [...this.props.orders];

    orders.sort((a, b) => {
      const statusA = statusValues[a.status];
      const statusB = statusValues[b.status];
      if (statusA < statusB) {
        return -1;
      }
      if (statusA > statusB) {
        return 1;
      }
      const timeA = a.timestamp;
      const timeB = b.timestamp;
      if (timeA > timeB) {
        return -1;
      }
      if (timeA < timeB) {
        return 1;
      }
      return 0;
    });
    const bids = orders.filter((order) => order.side === 'bid').slice().reverse();
    const asks = orders.filter((order) => order.side === 'ask');

    return (
      <>
        <div className="your-orders-header">
          YOUR ORDERS
        </div>
        <div style={{
          width: '100%', margin: 0, padding: 0, display: 'flex',
        }}
        >
          <div style={{
            width: '50%', margin: 0, padding: 0,
          }}>
            <div style={{
              height: '30px',
              lineHeight: '30px',
              textAlign: 'center',
            }}>
              Buying
            </div>
            <div style={{
              width: '100%', height: 'calc(100% - 30px)', margin: 0, padding: 0, overflowY: 'scroll',
            }}
            >
              {!!bids.length && bids.slice().reverse().map((order) => <UserOrder key={order.id} side="bid" order={order} orderCanceled={this.handleCancel} failedToCancelOrder={this.handleCancelFail} />)}
              {!bids.length && <div style={{ display: 'flex', height: '100%', color: '#999999', alignItems: 'center', justifyContent: 'center' }}>No buy orders</div>}
            </div>
          </div>
          <div style={{
            width: '50%', margin: 0, padding: 0,
          }}>
            <div style={{
              height: '30px',
              lineHeight: '30px',
              textAlign: 'center',
            }}>
              Selling
            </div>
            <div style={{
              width: '100%', height: 'calc(100% - 30px)', margin: 0, padding: 0, overflowY: 'scroll',
            }}
            >
              {!!asks.length && asks.map((order) => <UserOrder key={order.id} side="ask" order={order} orderCanceled={this.handleCancel} failedToCancelOrder={this.handleCancelFail} />)}
              {!asks.length && <div style={{ display: 'flex', height: '100%', color: '#999999', alignItems: 'center', justifyContent: 'center' }}>No sell orders</div>}
            </div>
          </div>
        </div>
      </>
    );
  }
}
