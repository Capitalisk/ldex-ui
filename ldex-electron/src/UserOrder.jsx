import React from 'react';
import './UserOrder.css';
import userContext from './context';
import { getLiteralAssetBalance, GlobalConfiguration as GC } from './Utils';

export default class UserOrder extends React.Component {
  static contextType = userContext;

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  clearOrder = async () => {
    this.props.orderCleared(this.props.order);
  }

  cancelOrder = async () => {
    const confirmed = window.confirm('Are you sure you want to cancel this limit order?');
    if (confirmed) {
      const { targetChain, sourceChain } = this.props.order;
      const dexAddress = GC.getMarketChainWalletAddress(this.context.activeMarket, sourceChain);
      const feeBase = GC.getMarketChainExchangeFeeBase(this.context.activeMarket, sourceChain);
      const orderId = this.props.order.id;
      const { passphrase } = this.context.keys[sourceChain];
      const assetAdapter = this.context.assetAdapters[sourceChain];
      const unitValue = GC.getAssetUnitValue(sourceChain);

      const tx = await assetAdapter.createTransfer({
        amount: String(Number(feeBase) + (Number(unitValue) / 100)),
        recipientAddress: dexAddress,
        message: `${targetChain},close,${orderId}`,
        passphrase,
        fee: String(feeBase),
      });

      const { order } = this.props;
      try {
        await assetAdapter.postTransaction({
          transaction: tx
        });
      } catch (error) {
        error.orderToCancel = order;
        this.props.failedToCancelOrder(error);

        return;
      }
      this.props.orderCanceled(this.props.order);
    }
  }

  render() {
    const amountRemaining = Number(this.props.order.side === 'ask' ? this.props.order.sizeRemaining : this.props.order.valueRemaining);
    const amount = Number(this.props.order.side === 'ask' ? this.props.order.size : this.props.order.value);
    const asset = this.props.order.sourceChain;
    const amountRemainingVerbose = getLiteralAssetBalance(amountRemaining, asset);
    const amountVerbose = getLiteralAssetBalance(amount, asset);
    const orderStatusClass = `order-${this.props.order.status || 'default'}`;

    return (
      <div
        className={`your-order-entry ${orderStatusClass}`}
        style={{
          backgroundColor: this.props.side === 'bid' ? '#286113' : '#700d0d',
        }}
      >
        <div className="your-order-amount-and-price">
          {amountRemainingVerbose}/{amountVerbose}
          <br />
          {this.props.order.price != null && (
            <div>
              Price:
              {' '}
              {this.props.order.price.toFixed(4)}
            </div>
          )}
          {this.props.order.price == null && <div>Market order</div>}
        </div>
        <div className="your-order-controls">
          {(this.props.order.status === 'ready' || this.props.order.status === 'matching') && <button type="button" className="user-order-button" onClick={this.cancelOrder}>Cancel</button>}
          {this.props.order.status === 'pending' && <button type="button" className="user-order-button" onClick={this.clearOrder}>Clear</button>}
          {this.props.order.status !== 'ready' && <div className="lds-dual-ring" />}
        </div>
      </div>
    );
  }
}
