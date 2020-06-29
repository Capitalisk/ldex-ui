import React from 'react';
import './PlaceOrder.css';
import InfoIcon from "./InfoIcon";
import Modal from './Modal'
import marketInfoDescriptor from './Market'
import './Table.css'

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

  onMarketChange= (e) => {
    const confirmed = window.confirm('You will be logged out of current session, are you sure you want to change the market selection? ');
    if (!confirmed) {
      e.preventDefault();
    } else {
      this.props.signOut()
    }
  }

  getModalContentFromConfig(config) {
    if (config) {
      const dexConfig = config.markets[this.props.activeMarket].dexOptions;
      const ignoreKeysFromConfig = ["orderBookHash, processedHeights", "chainsWhitelist", "multisigMembers"];
      const chains = dexConfig.chainsWhitelist;
      const firstChain = dexConfig.chains[chains[0]];
      const secondChain = dexConfig.chains[chains[1]];

      return <table style={{width: '-webkit-fill-available'}}>
        <tr style={{'textTransform': 'uppercase'}}>
          <th></th>
          {chains.map((chain) => <th>{chain}</th>)}
        </tr>
        <tr>
          <td style={{fontWeight: 'bold'}}>Version</td>
          <td colSpan={2} style={{textAlign: 'center', 'textTransform': 'uppercase'}}>{dexConfig.version}</td>
        </tr>
        <tr>
          <td style={{fontWeight: 'bold'}}>Base Chain</td>
          <td colSpan={2} style={{textAlign: 'center', 'textTransform': 'uppercase'}}>{dexConfig.baseChain}</td>
        </tr>
        <tr>
          <td style={{fontWeight: 'bold'}} >Price Decimal Precision</td>
          <td colSpan={2} style={{textAlign: 'center', 'textTransform': 'uppercase'}}>{dexConfig.priceDecimalPrecision}</td>
        </tr>
        {
          Object.keys(firstChain).map((chainInfoKey) => {
            if (!ignoreKeysFromConfig.includes(chainInfoKey)) {
              return <tr>
                <td style={{fontWeight: 'bold'}}>{marketInfoDescriptor[chainInfoKey].name}</td>
                <td>{firstChain[chainInfoKey]}</td>
                <td>{secondChain[chainInfoKey]}</td>
              </tr>
            }
          })
        }
      </table>
    }
    return <div/>
  }

  render() {
    return (
      <>
x        <div style={{ padding: '10px' }}>
          <Modal modalOpened={this.state.modalOpened} closeModal={this.modalClose}>
            {this.getModalContentFromConfig(this.props.configuration)}
          </Modal>
          <div className="action-name">MARKETS</div>
          <div className="markets-container">
            {Object.keys(this.props.configuration.markets).map((marketSymbol) => (
              <div key={marketSymbol}>
                <p>
                  <b>
                    {
                      marketSymbol === this.props.activeMarket ?
                          marketSymbol.toUpperCase()
                          :
                          <a onClick={this.onMarketChange} href={`#market=${marketSymbol}`}>{marketSymbol.toUpperCase()}</a>
                    }
                  </b>
                  &nbsp;&nbsp;
                  {marketSymbol === this.props.activeMarket && <InfoIcon alt="info" width="18px" marginBottom='-2px' onClick={this.onInfoIconClick} cursor='pointer'/>}
                </p>
              </div>
            ))}
          </div>
          <p style={{color: '#999999'}}>More markets coming soon!</p>
          <small>
            <br />
            Data refreshed every
            {' '}
            {Math.round(this.props.configuration.refreshInterval / 1000)}
            {' '}
            seconds.
          </small>
        </div>
      </>
    );
  }
}
