import React from "react";
import "./App.css";

export default class SignInState extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    let addressesInfo = '';
    for (const asset in this.props.keys) {
      addressesInfo += `${this.props.keys[asset].address} (${asset}) `;
    }
    return (
      <>
        {!this.props.signedIn &&
          <button onClick={this.props.showSignIn} className="sign-in-button">
            Sign in
          </button>
        }
        {this.props.signedIn &&
          <span style={{ fontSize: '12px', marginRight: '10px' }}>Signed in as {addressesInfo}</span>
        }
        {this.props.signedIn &&
          <button onClick={this.props.signOut} className="sign-in-button">
            Sign out
          </button>
        }
      </>
    );
  }
}
