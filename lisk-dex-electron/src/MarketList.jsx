import React from 'react';
import './PlaceOrder.css';

export default class MarketList extends React.Component {
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

  render() {
    return (
      <>
        <div style={{ padding: '10px' }}>
          <div className="action-name">MARKETS</div>
          <div className="markets-container">
            {Object.keys(this.props.markets).map((marketSymbol) => (
              <div key={marketSymbol}>
                <p>
                  <b>{marketSymbol === this.props.activeMarket ? marketSymbol.toUpperCase() : <a href={`#market=${marketSymbol}`}>{marketSymbol.toUpperCase()}</a>}</b>
                </p>
              </div>
            ))}
          </div>
          <p style={{color: '#999999'}}>More markets coming soon!</p>
          <small>
            <br />
            Data refreshed every
            {' '}
            {Math.round(this.props.refreshInterval / 1000)}
            {' '}
            seconds.
          </small>
        </div>
      </>
    );
  }
}
