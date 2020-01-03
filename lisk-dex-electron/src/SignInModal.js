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
    this.props.passphraseSubmit(this.state.passphrase);
  }

  render() {
    const styles = { border: '1px solid red' };
    if (!this.props.failure) {
      styles.border = '1px solid grey';
    }
    return (
      <div id="sign-in-modal">
        <div style={{ textAlign: 'right', width: '100%' }}>
          <button className="place-order-button" onClick={this.props.close}>Close</button>
        </div>
        <h2>Sign in using your Lisk passphrase.</h2>

        <form onSubmit={this.handleSubmit}>
          <textarea style={styles} rows={4} name="passphrase" id="sign-in-textarea" value={this.state.passphrase} onChange={this.handleChange} />
          <p>
            <span style={{ color: 'red' }}>Be careful!</span> Only enter your Lisk passphrase in applications you trust and obtained from official sources.
          </p>
          <input className="place-order-button" type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}
