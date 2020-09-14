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
      if (this.props.keys[asset]) {
        addressesInfo += `${this.props.keys[asset].address} (${asset.toUpperCase()}) `;
        addressCount++;
      }
    }
    return (
      <>
        {addressCount >= 1 && (
          <span style={{
            fontSize: '12px', marginRight: '10px', display: 'inline-block', verticalAlign: 'top', marginTop: '10px',
          }}
          >
            Signed in
            <span className="sign-in-state-address">
              {' '}
              as
              {' '}
              {addressesInfo}
            </span>
          </span>
        )}
        <button type="button" onClick={this.props.showSignIn} className="button-primary">
          Sign in
        </button>
      </>
    );
  }
}
