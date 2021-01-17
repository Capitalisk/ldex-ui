import React from 'react';
import './SignInModal.css';
import './progress.css';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { GlobalConfiguration as GC } from './Utils';

export default class SignInModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passphrases: {},
      addresses: {},
      failure: false,
      signingIn: false,
    };
    let assetNames = GC.getAssetNames();
    for (let asset of assetNames) {
      this.state.passphrases[asset] = '';
      this.state.addresses[asset] = '';
    }
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

  handleWalletAddressChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState((prevState) => ({
      addresses: {
        ...prevState.addresses,
        [name]: value,
      },
    }));
  }

  handlePassphraseChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    // TODO: When the new client wrapper has been implemented, only upate the address
    // if the client wrapper exposes a 'getAddressFromPassphrase' method.
    this.updateAddress(name, value);

    this.setState((prevState) => ({
      passphrases: {
        ...prevState.passphrases,
        [name]: value,
      },
    }));
  }

  handleSubmit = async (event) => {
    event.preventDefault();
    const assetLoginDetails = {};
    for (const asset of this.props.enabledAssets) {
      assetLoginDetails[asset] = {
        address: this.state.addresses[asset],
        passphrase: this.state.passphrases[asset],
      };
    }
    await this.setState({ signingIn: true });
    const success = await this.props.submitLoginDetails(assetLoginDetails);
    if (!success) {
      await this.setState({ signingIn: false, failure: true });
    }
  }

  handleWalletCreate = (event) => {
    event.preventDefault();
    const asset = event.target.name;
    const passphrase = Mnemonic.generateMnemonic();

    this.setState((prevState) => ({
      passphrases: {
        ...prevState.passphrases,
        [asset]: passphrase,
      },
    }));

    // TODO: When the new client wrapper has been implemented, only upate the address
    // if the client wrapper exposes a 'getAddressFromPassphrase' method.
    const address = this.updateAddress(asset, passphrase);

    if (this.props.walletGenerated) {
      this.props.walletGenerated(address, passphrase);
    }
  }

  render() {
    const styles = {};
    if (this.state.failure) {
      styles.border = '1px solid red';
    } else {
      styles.border = '1px solid grey';
    }
    const loginAssetPanels = [];
    for (const asset of this.props.enabledAssets) {
      const assetConfig = GC.getAsset(asset);

      loginAssetPanels.push(
        <div key={asset} style={{ marginBottom: '20px' }}>
          {assetConfig.allowCustomWalletAddresses && <span>Wallet address for {asset.toUpperCase()}:</span>}
          {assetConfig.allowCustomWalletAddresses && <input style={styles} name={asset} data-gramm={false} className="sign-in-input" value={this.state.addresses[asset]} onChange={this.handleWalletAddressChange} />}
          <span>
            Passphrase for
            {' '}
            {asset.toUpperCase()}
            :
            {' '}
          </span>
          <textarea style={styles} rows={4} name={asset} data-gramm={false} className="sign-in-textarea" value={this.state.passphrases[asset]} onChange={this.handlePassphraseChange} />
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

      loginAssetPanels.push(<hr key={`${asset}-underline`} style={{ marginTop: '30px', marginBottom: '30px' }} />)
    }
    loginAssetPanels.pop();
    return (
      <>
        <div className="modal-background" />
        <div id="sign-in-modal" className="modal-foreground">
          <form onSubmit={this.handleSubmit}>
            <div className="sign-in-progress-area">
              {this.state.signingIn && (
                <div className="progress">
                  <div className="indeterminate" />
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', width: '100%' }}>
              <button type="button" className="button-secondary" onClick={this.props.close}>Close</button>
            </div>
            <h2 className="sign-in-heading">Sign in using your blockchain passphrases.</h2>
            {loginAssetPanels}
            <input className="button-primary" style={{ fontSize: '20px', marginTop: '15px' }} type="submit" value="Submit" />
          </form>
        </div>
      </>
    );
  }
}
