import React from 'react';
import userContext from './context';
import './Notification.css';

export default class Notification extends React.Component {
  static contextType = userContext;

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  render() {
    return (
      <div className={`notification-container ${this.props.data.isActive ? 'active' : 'inactive'} ${this.props.data.isError ? 'error' : 'info'}`}>
        {this.props.data.message}
      </div>
    );
  }
}
