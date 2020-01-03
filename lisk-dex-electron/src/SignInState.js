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
      <button onClick={this.props.showSignIn} className="sign-in-button">
        Sign in
      </button>
    );
  }
}
