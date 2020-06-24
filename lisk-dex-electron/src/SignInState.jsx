import React from 'react';
import './App.css';

export default class SignInState extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    let addressesInfo = '';
    let addressCount = 0;
    // eslint-disable-next-line guard-for-in
    for (const asset in this.props.keys) {
      addressesInfo += `${this.props.keys[asset].address} (${asset.toUpperCase()}) `;
      addressCount++;
    }
    return (
      <>
        {!this.props.signedIn
          && (
          <button type="button" onClick={this.props.showSignIn} className="button-primary">
            Sign in
          </button>
          )}
        {this.props.signedIn && addressCount < 3 && (
          <span style={{ fontSize: '12px', marginRight: '10px' }}>
            Signed in
            <span className="sign-in-state-address">
              {' '}
              as
              {' '}
              {addressesInfo}
            </span>
          </span>
        )}
        {this.props.signedIn && addressCount >= 3 && (
          <span style={{ fontSize: '12px', marginRight: '10px' }}>Signed in</span>
        )}
        {this.props.signedIn
          && (
          <button type="button" onClick={this.props.signOut} className="button-primary">
            Sign out
          </button>
        )}
      </>
    );
  }
}
