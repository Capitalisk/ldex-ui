import React from 'react';
import './PlaceOrder.css';
import InfoIcon from "./InfoIcon";
import Modal from './Modal'

export default class MarketList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      modalOpened: false
    }
  }

  onInfoIconClick = () => {
    this.setState({ modalOpened: true })
  }

  modalClose = () => {
    this.setState({ modalOpened: false })
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
          <Modal modalOpened={this.state.modalOpened} closeModal={this.modalClose}/>
          <div className="action-name">MARKETS</div>
          <div className="markets-container">
            {Object.keys(this.props.markets).map((marketSymbol) => (
              <div key={marketSymbol}>
                <p>
                  <b>{marketSymbol === this.props.activeMarket ? marketSymbol.toUpperCase() : <a href={`#market=${marketSymbol}`}>{marketSymbol.toUpperCase()}</a>}</b>
                  &nbsp;&nbsp;
                  <InfoIcon alt="info" width="18px" onClick={this.onInfoIconClick} cursor='pointer'/>
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
