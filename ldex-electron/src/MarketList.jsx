import React from 'react';
import './PlaceOrder.css';
import InfoIcon from './InfoIcon';
import Modal from './Modal';
import marketInfoDescriptor from './Market';
import './Table.css';
import { GlobalConfiguration as GC } from './Utils';

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

  getModalContentFromConfig() {
    if (GC.getConfig()) {
      const chains = GC.getMarketChainNames(this.props.activeMarket);
      const firstChain = GC.getMarketChain(this.props.activeMarket, chains[0]);
      const secondChain = GC.getMarketChain(this.props.activeMarket, chains[1]);

      const getBasicTableRow = (firstCellValue, secondCellValue) => (
        <tr>
          <td style={{ fontWeight: 'bold', border: 'none', width: '50%', wordBreak: 'break-word', padding: '5px' }}>{firstCellValue}</td>
          <td
            colSpan={2}
            style={{
              textTransform: 'uppercase', border: 'none', width: '50%',
              wordBreak: 'break-word',
              padding: '5px',
            }}
          >
            {secondCellValue}
          </td>
        </tr>
      );

      return (
        <div className="market-info-container">
          <table style={{ border: 'none', width: '60%', tableLayout: 'fixed' }}>
            <tbody>
              {getBasicTableRow('Version', GC.getMarketVersion(this.props.activeMarket))}
              {getBasicTableRow('Base chain', GC.getMarketBaseChain(this.props.activeMarket))}
              {getBasicTableRow('Price decimal precision', GC.getMarketPriceDecimalPrecision(this.props.activeMarket))}
            </tbody>
          </table>
          <table style={{ width: '-webkit-fill-available', marginTop: '20px', tableLayout: 'fixed' }}>
            <tbody>
              <tr style={{ textTransform: 'uppercase' }}>
                <th> </th>
                {chains.map((chain) => <th key={chain}>{chain}</th>)}
              </tr>
              {
              Object.keys(firstChain).map((chainInfoKey) => {
                let renderList = (list) => {
                  return <ul style={{ paddingLeft: '20px' }}>{list.map(item => <li key={item}>{item}</li>)}</ul>;
                };
                if (Array.isArray(firstChain[chainInfoKey])) {
                  const firstChainValues = renderList(firstChain[chainInfoKey]);
                  const secondChainValues = renderList(secondChain[chainInfoKey]);
                  return (
                    <tr key={chainInfoKey}>
                      <td style={{ fontWeight: 'bold', wordBreak: 'break-word', padding: '5px' }}>{marketInfoDescriptor[chainInfoKey].name}</td>
                      <td style={{ wordBreak: 'break-word', padding: '5px' }}>{firstChainValues}</td>
                      <td style={{ wordBreak: 'break-word', padding: '5px' }}>{secondChainValues}</td>
                    </tr>
                  );
                }
                let firstChainValue = firstChain[chainInfoKey];
                let secondChainValue = secondChain[chainInfoKey];
                const keyDescriptor = marketInfoDescriptor[chainInfoKey];
                if ('mult' in keyDescriptor) {
                  firstChainValue *= keyDescriptor.mult;
                  firstChainValue = Math.round(firstChainValue * 10000) / 10000;
                  firstChainValue += '%';
                  secondChainValue *= keyDescriptor.mult;
                  secondChainValue = Math.round(secondChainValue * 10000) / 10000;
                  secondChainValue += '%';
                }
                if ('isUnitValue' in keyDescriptor) {
                  firstChainValue /= GC.getAssetUnitValue(chains[0]);
                  secondChainValue /= GC.getAssetUnitValue(chains[1]);
                }
                return (
                  <tr key={chainInfoKey}>
                    <td style={{ fontWeight: 'bold', wordBreak: 'break-word', padding: '5px' }}>{keyDescriptor.name}</td>
                    <td style={{ wordBreak: 'break-word', padding: '5px' }}>{firstChainValue}</td>
                    <td style={{ wordBreak: 'break-word', padding: '5px' }}>{secondChainValue}</td>
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
            {this.getModalContentFromConfig()}
          </Modal>
          <div className="action-name">MARKETS</div>
          <div className="markets-container">
            {GC.getMarketNames().map((marketSymbol) => {
              const chainNames = GC.getMarketChainNames(marketSymbol);
              const isCentralized = chainNames.some((chainName) => GC.getMarketChainRequiredSignatureCount(marketSymbol, chainName) <= 1);
              return (
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
                    {marketSymbol === this.props.activeMarket && <InfoIcon alt="info" width="18px" marginBottom="-2px" onClick={this.onInfoIconClick} cursor="pointer" warn={isCentralized} />}
                  </p>
                </div>
              );
            })}
          </div>
          <p style={{ color: '#999999' }}>More markets coming soon!</p>
          <small>
            <br />
            Data refreshed every
            {' '}
            {Math.round(GC.getRefreshInterval() / 1000)}
            {' '}
            seconds.
          </small>
        </div>
      </>
    );
  }
}
