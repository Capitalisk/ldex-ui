import React from 'react';
import './SignInModal.css';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';


export default class PlaceOrder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passphrase: '',
      addresses: {},
    };
  }

  updateAddress(asset, passphrase) {
    const isValidPassphrase = Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english);
    const address = isValidPassphrase ? cryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address : null;

    this.setState((prevState) => ({
      addresses: {
        ...prevState.addresses,
        [asset]: address,
      },
    }));

    return address;
  }

  handleChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.updateAddress(name, value);

    this.setState({
      [name]: value,
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
    const payload = {};
    for (const asset of this.props.enabledAssets) {
      payload[asset] = this.state[asset];
    }
    this.props.passphraseSubmit(payload);
  }

  handleWalletCreate = (event) => {
    event.preventDefault();
    const asset = event.target.name;
    const passphrase = Mnemonic.generateMnemonic();

    this.setState({
      [asset]: passphrase,
    });

    const address = this.updateAddress(asset, passphrase);

    if (this.props.walletGenerated) {
      this.props.walletGenerated(address, passphrase);
    }
  }

  render() {
    const styles = { border: '1px solid red' };
    if (!this.props.failure) {
      styles.border = '1px solid grey';
    }
    const passphraseTextareas = [];
    for (const asset of this.props.enabledAssets) {
      passphraseTextareas.push(
        <div key={asset} style={{ marginBottom: '20px' }}>
          <span>
            Passphrase for
            {' '}
            {asset.toUpperCase()}
            :
            {' '}
          </span>
          <textarea style={styles} rows={4} name={asset} data-gramm={false} className="sign-in-textarea" value={this.state[asset]} onChange={this.handleChange} />
          <button type="button" className="button-secondary" name={asset} onClick={this.handleWalletCreate} style={{ marginRight: '10px' }}>Generate wallet</button>
          {' '}
          {this.state.addresses[asset] && (
          <span className="generated-wallet-address">
            Wallet address:
            {' '}
            {this.state.addresses[asset]}
          </span>
          )}
        </div>,
      );
    }
    return (
      <>
        <div className="modal-background" />
        <div id="sign-in-modal" className="modal-foreground">
          <form onSubmit={this.handleSubmit}>
            <div style={{ textAlign: 'right', width: '100%' }}>
              <button type="button" className="button-secondary" onClick={this.props.close}>Close</button>
            </div>
            <h2>Sign in using your blockchain passphrases.</h2>
            <p>
              <span style={{ color: 'red' }}>Be careful!</span>
              {' '}
              Never share your passphrase with anyone! Only enter your passphrase in applications which you trust and are obtained from official sources.
            </p>
            <p>
              It is
              {' '}
              <b>strongly recommended for security</b>
              {' '}
              that you provide a separate passphrase for every chain you will trade across. Using the same passphrase for multiple assets will make
              you vulnerable to cross-chain replay attacks.
            </p>
            {passphraseTextareas}
            <input className="button-primary" style={{ fontSize: '20px', marginTop: '15px' }} type="submit" value="Submit" />
          </form>
        </div>
      </>
    );
  }
}
