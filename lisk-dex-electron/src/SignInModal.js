import React from "react";
import "./SignInModal.css";

export default class PlaceOrder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passphrase: ""
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;
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

  render() {
    const styles = { border: '1px solid red' };
    if (!this.props.failure) {
      styles.border = '1px solid grey';
    }
    const passphraseTextareas = [];
    for (let asset of this.props.enabledAssets) {
      passphraseTextareas.push(
        <div key={asset}>
          <span>Passphrase for {asset.toUpperCase()}: </span>
          <textarea style={styles} rows={4} name={asset} id="sign-in-textarea" value={this.state[asset]} onChange={this.handleChange} />
        </div>
      )
    }
    return (
      <div id="sign-in-modal">
        <form onSubmit={this.handleSubmit}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <input className="sign-in-button" style={{ fontSize: '20px', marginRight: '10px' }} type="submit" value="Submit" />
            <button className="place-order-button" onClick={this.props.close}>Close</button>
          </div>
          <h2>Sign in using your Lisk passphrases.</h2>

          <p>
            <span style={{ color: 'red' }}>Be careful!</span> Only enter your Lisk passphrase in applications you trust and obtained from official sources.
          </p>
          <p>
            It is <b>strongly recommended for security</b> that you provide a separate passphrase for every chain you will trade across. Using the same passphrase for multiple assets will make
            you vulnerable to cross-chain replay attacks.
          </p>
          {passphraseTextareas}
          <input className="sign-in-button" style={{ fontSize: '20px', marginTop: '15px' }} type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}
