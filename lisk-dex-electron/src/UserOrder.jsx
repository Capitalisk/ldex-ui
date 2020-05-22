import React from 'react';
import './UserOrder.css';
import * as transactions from '@liskhq/lisk-transactions';
import axios from 'axios';
import userContext from './context';

export default class UserOrder extends React.Component {
  static contextType = userContext;

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  cancelOrder = async () => {
    const confirmed = window.confirm('Are you sure you want to cancel this limit order?');
    if (confirmed) {
      const dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.props.order.sourceChain].walletAddress;
      const { passphrase } = this.context.keys[this.props.order.sourceChain];
      const { targetChain } = this.props.order;
      const orderId = this.props.order.id;
      const broadcastURL = this.context.configuration.assets[this.props.order.sourceChain].apiUrl;

      const tx = transactions.transfer({
        amount: transactions.utils.convertLSKToBeddows('0.11').toString(),
        recipientId: dexAddress,
        data: `${targetChain},close,${orderId}`,
        passphrase,
      });
      let order = this.props.order;
      try {
        await axios.post(`${broadcastURL}/transactions`, tx);
      } catch (error) {
        error.orderToCancel = order;
        this.props.failedToCancelOrder(error);

        return;
      }
      this.props.orderCanceled(this.props.order);
    }
  }

  render() {
    const amountRemaining = this.props.order.side === 'ask' ? this.props.order.sizeRemaining : this.props.order.valueRemaining;
    const amount = this.props.order.side === 'ask' ? this.props.order.size : this.props.order.value;

    const orderStatusClass = `order-${this.props.order.status || 'default'}`;

    return (
      <div
        className={`your-order-entry ${orderStatusClass}`}
        style={{
          width: '100%', fontSize: '14px', backgroundColor: this.props.side === 'bid' ? '#286113' : '#700d0d', borderBottom: '1px solid black', padding: '2px', boxSizing: 'border-box',
        }}
      >
        {(amountRemaining / (10 ** 8)).toFixed(4)}
        /
        {(amount / (10 ** 8)).toFixed(4)}
        {(this.props.order.status === 'ready' || this.props.order.status === 'matching') && <button type="button" className="cancel-order-button" onClick={this.cancelOrder}>Cancel</button>}
        {this.props.order.status !== 'ready' && <div className="lds-dual-ring" style={{ float: 'right', marginRight: '10px' }} />}
        <br />
        {this.props.order.price != null && (
        <div>
          Price:
          {this.props.order.price.toFixed(4)}
        </div>
        )}
        {this.props.order.price == null && <div>Market order</div>}
      </div>
    );
  }
}
