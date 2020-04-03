import React from 'react';
import './SignInModal.css';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as passphrase from '@liskhq/lisk-passphrase';

const { Mnemonic } = passphrase;

export default class PlaceOrder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passphrase: '',
      addresses: {}
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleWalletCreate = this.handleWalletCreate.bind(this);
  }

  updateAddress(asset, passphrase) {
    const isValidPassphrase = Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english);
    const address = isValidPassphrase ? cryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address : null;

    this.setState({
      addresses: {
        ...this.state.addresses,
        [asset]: address
      }
    });

    return address;
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.updateAddress(name, value);

    this.setState({
      [name]: value
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const payload = {};
    for (let asset of this.props.enabledAssets) {
      payload[asset] = this.state[asset];
    }
    this.props.passphraseSubmit(payload)
  }

  handleWalletCreate(event) {
    event.preventDefault();
    let asset = event.target.name;
    let passphrase = Mnemonic.generateMnemonic();

    this.setState({
      [asset]: passphrase
    });

    let address = this.updateAddress(asset, passphrase);

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
    for (let asset of this.props.enabledAssets) {
      passphraseTextareas.push(
        <div key={asset} style={{ marginBottom: '20px' }}>
          <span>Passphrase for {asset.toUpperCase()}: </span>
          <textarea style={styles} rows={4} name={asset} className="sign-in-textarea" value={this.state[asset]} onChange={this.handleChange} />
          <button className="button-secondary" name={asset} onClick={this.handleWalletCreate} style={{ marginRight: '10px' }}>Generate wallet</button> {this.state.addresses[asset] && <span className="generated-wallet-address">Wallet address: {this.state.addresses[asset]}</span>}
        </div>
      );
    }
    return (
      <>
        <div className="modal-background"></div>
        <div id="sign-in-modal" className="modal-foreground">
          <form onSubmit={this.handleSubmit}>
            <div style={{ textAlign: 'right', width: '100%' }}>
              <input className="button-primary" style={{ fontSize: '20px', marginRight: '10px' }} type="submit" value="Submit" />
              <button className="button-secondary" onClick={this.props.close}>Close</button>
            </div>
            <h2>Sign in using your blockchain passphrases.</h2>
            <p>
              <span style={{ color: 'red' }}>Be careful!</span> Never share your passphrase with anyone! Only enter your passphrase in applications which you trust and are obtained from official sources.
            </p>
            <p>
              It is <b>strongly recommended for security</b> that you provide a separate passphrase for every chain you will trade across. Using the same passphrase for multiple assets will make
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
