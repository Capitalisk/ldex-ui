import React from 'react';
import './PlaceOrder.css';
import InfoIcon from './InfoIcon';
import Modal from './Modal';
import marketInfoDescriptor from './Market';
import './Table.css';

export default class MarketList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      modalOpened: false,
    };
  }

  onInfoIconClick = () => {
    this.setState({ modalOpened: true });
  }

  modalClose = () => {
    this.setState({ modalOpened: false });
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

  getModalContentFromConfig(config) {
    if (config) {
      const dexConfig = config.markets[this.props.activeMarket].dexOptions;
      const chains = Object.keys(dexConfig.chains);
      const firstChain = dexConfig.chains[chains[0]];
      const secondChain = dexConfig.chains[chains[1]];

      const getBasicTableRow = (firstCellValue, secondCellValue) => (
        <tr>
          <td style={{ fontWeight: 'bold', border: 'none', width: '50%' }}>{firstCellValue}</td>
          <td
            colSpan={2}
            style={{
              textTransform: 'uppercase', border: 'none', width: '50%',
            }}
          >
            {secondCellValue}
          </td>
        </tr>
      );

      return (
        <div>
          <table style={{ border: 'none', width: '60%' }}>
            <tbody>
              {getBasicTableRow('Version', dexConfig.version)}
              {getBasicTableRow('Base chain', dexConfig.baseChain)}
              {getBasicTableRow('Price decimal precision', dexConfig.priceDecimalPrecision)}
            </tbody>
          </table>
          <table style={{ width: '-webkit-fill-available', marginTop: '20px' }}>
            <tbody>
              <tr style={{ textTransform: 'uppercase' }}>
                <th> </th>
                {chains.map((chain) => <th key={chain}>{chain}</th>)}
              </tr>
              {
              Object.keys(firstChain).map((chainInfoKey) => {
                if (Array.isArray(firstChain[chainInfoKey])) {
                  const firstChainValues = firstChain[chainInfoKey].join('\r\n');
                  const secondChainValues = secondChain[chainInfoKey].join('\r\n');
                  return (
                    <tr key={chainInfoKey}>
                      <td style={{ fontWeight: 'bold' }}>{marketInfoDescriptor[chainInfoKey].name}</td>
                      <td style={{ whiteSpace: 'pre' }}>{firstChainValues}</td>
                      <td style={{ whiteSpace: 'pre' }}>{secondChainValues}</td>
                    </tr>
                  );
                }
                let firstChainValue = firstChain[chainInfoKey];
                let secondChainValue = secondChain[chainInfoKey];
                const keyDescriptor = marketInfoDescriptor[chainInfoKey];
                if ('mult' in keyDescriptor) {
                  firstChainValue *= keyDescriptor.mult;
                  firstChainValue += '%';
                  secondChainValue *= keyDescriptor.mult;
                  secondChainValue += '%';
                }
                if ('div' in keyDescriptor) {
                  firstChainValue /= keyDescriptor.div;
                  secondChainValue /= keyDescriptor.div;
                }
                return (
                  <tr key={chainInfoKey}>
                    <td style={{ fontWeight: 'bold' }}>{keyDescriptor.name}</td>
                    <td>{firstChainValue}</td>
                    <td>{secondChainValue}</td>
                  </tr>
                );
              })
            }
            </tbody>
          </table>
        </div>
      );
    }
    return <div />;
  }

  render() {
    return (
      <>
        {' '}
        <div style={{ padding: '10px' }}>
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
                      marketSymbol === this.props.activeMarket
                        ? marketSymbol.toUpperCase()
                        : <a href={`#market=${marketSymbol}`}>{marketSymbol.toUpperCase()}</a>
                    }
                  </b>
                  &nbsp;&nbsp;
                  {marketSymbol === this.props.activeMarket && <InfoIcon alt="info" width="18px" marginBottom="-2px" onClick={this.onInfoIconClick} cursor="pointer" />}
                </p>
              </div>
            ))}
          </div>
          <p style={{ color: '#999999' }}>More markets coming soon!</p>
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
