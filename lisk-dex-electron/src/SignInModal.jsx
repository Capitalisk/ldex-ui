import React from 'react';
import './SignInModal.scss';
import './progress.scss';
import { GlobalConfiguration as GC } from './Utils';

export default class SignInModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passphrases: {},
      addresses: {},
      keyIndexes: {},
      failure: false,
      signingIn: false,
    };
    this.assetAdapters = props.assetAdapters;
    let assetNames = GC.getAssetNames();
    for (let asset of assetNames) {
      this.state.passphrases[asset] = '';
      this.state.addresses[asset] = '';
    }
  }

  async getKeyIndex(asset, address) {
    const assetAdapter = this.assetAdapters[asset];
    if (!address.length || !assetAdapter.getAccountNextKeyIndex) {
      return null;
    }
    let keyIndex;
    try {
      keyIndex = await assetAdapter.getAccountNextKeyIndex({ address });
    } catch (error) {}
    return keyIndex || 0;
  }

  async updateAddress(asset, passphrase) {
    const assetAdapter = this.assetAdapters[asset];
    const isValidPassphrase = assetAdapter.validatePassphrase({ passphrase });
    const address = isValidPassphrase ? assetAdapter.getAddressFromPassphrase({ passphrase }) : null;

    const keyIndex = await this.getKeyIndex(asset, address);

    this.setState((prevState) => ({
      addresses: {
        ...prevState.addresses,
        [asset]: address,
      },
      keyIndexes: {
        ...prevState.keyIndexes,
        [asset]: keyIndex
      },
    }));

    return address;
  }

  handleWalletAddressChange = async (event) => {
    const { target } = event;
    const value = target.value || '';
    const { name } = target;

    const keyIndex = await this.getKeyIndex(name, value);

    this.setState((prevState) => ({
      addresses: {
        ...prevState.addresses,
        [name]: value,
      },
      keyIndexes: {
        ...prevState.keyIndexes,
        [name]: keyIndex
      },
    }));
  }

  handlePassphraseChange = (event) => {
    const { target } = event;
    const value = target.value || '';
    const { name } = target;

    // Only upate the address if the client wrapper exposes a getAddressFromPassphrase method.
    if (value.length && this.assetAdapters[name].getAddressFromPassphrase) {
      this.updateAddress(name, value);
    }

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
    this.setState({ signingIn: true });
    const success = await this.props.submitLoginDetails(assetLoginDetails);
    if (!success) {
      this.setState({ signingIn: false, failure: true });
    }
  }

  handleWalletCreate = async (event) => {
    event.preventDefault();
    const asset = event.target.name;
    let assetAdapter = this.assetAdapters[asset];
    const { address, passphrase } = assetAdapter.createWallet();
    const keyIndex = await this.getKeyIndex(asset, address);

    this.setState((prevState) => ({
      passphrases: {
        ...prevState.passphrases,
        [asset]: passphrase,
      },
      addresses: {
        ...prevState.addresses,
        [asset]: address,
      },
      keyIndexes: {
        ...prevState.keyIndexes,
        [asset]: keyIndex
      },
    }));

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
      const addressInputStyles = { ...styles };
      if (!assetConfig.allowCustomWalletAddresses) {
        delete addressInputStyles.border;
        addressInputStyles.borderStyle = 'none';
      }

      loginAssetPanels.push(
        <div key={asset} style={{ marginBottom: '20px' }}>
          {<span>Wallet address for {asset.toUpperCase()}:</span>}
          {<input style={addressInputStyles} name={asset} data-gramm={false} className="sign-in-input" value={this.state.addresses[asset]} onChange={this.handleWalletAddressChange} disabled={!assetConfig.allowCustomWalletAddresses} />}
          <span>
            Passphrase for
            {' '}
            {asset.toUpperCase()}
            :
            {' '}
          </span>
          <textarea style={styles} rows={4} name={asset} data-gramm={false} className="sign-in-textarea" value={this.state.passphrases[asset]} onChange={this.handlePassphraseChange} />
          <button type="button" className="button-secondary" name={asset} onClick={this.handleWalletCreate} style={{ marginRight: '10px' }}>Generate wallet</button>
          {this.state.keyIndexes[asset] != null && <span><span>Next key index: </span><span>{this.state.keyIndexes[asset]}</span></span>}
        </div>,
      );

      loginAssetPanels.push(<hr key={`${asset}-underline`} style={{ marginTop: '30px', marginBottom: '30px' }} />)
    }
    loginAssetPanels.pop();
    return (
      <>
        <div className="modal-background" />
        <div className="modal-foreground">
          <div id="sign-in-modal">
            <div className="button-wrapper">
              <div class="close-btn">
                <span role="img" aria-label="close" className="clickable" onClick={this.props.close}>&#x2715;</span>
              </div>
            </div>
            <form onSubmit={this.handleSubmit}>
              {this.state.signingIn && (
                <div className="sign-in-progress-area">
                    <div className="progress">
                      <div className="indeterminate" />
                    </div>
                </div>
              )}
              <h2 className="sign-in-heading">Sign in using your blockchain passphrases.</h2>
              {loginAssetPanels}
              <input className="button-primary" style={{ fontSize: '20px', marginTop: '15px' }} type="submit" value="Submit" />
            </form>
          </div>
        </div>
      </>
    );
  }
}
