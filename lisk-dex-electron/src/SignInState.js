import React from "react";
import "./App.css";

export default class SignInState extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
      <>
        {!this.props.signedIn &&
          <button onClick={this.props.showSignIn} className="sign-in-button">
            Sign in
          </button>
        }
        {this.props.signedIn &&
          <span style={{ fontSize: '16px', marginRight: '10px' }}>Signed in as {this.props.address}</span>
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
