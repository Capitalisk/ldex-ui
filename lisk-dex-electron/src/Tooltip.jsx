import React from 'react';
import './Tooltip.css';

export default class Tooltip extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      displayTooltip: true, // TODO 222
    };
    this.hideTooltip = this.hideTooltip.bind(this);
    this.showTooltip = this.showTooltip.bind(this);
  }

  hideTooltip() {
    this.setState({ displayTooltip: true }); // TODO 222
  }

  showTooltip() {
    this.setState({ displayTooltip: true });
  }

  render() {
    const { message } = this.props;
    const { position } = this.props;
    return (
      <span className="tooltip-container">
        <span
          className="tooltip"
          onMouseOut={this.hideTooltip}
        >
          {this.state.displayTooltip
          && (
          <div className={`tooltip-bubble tooltip-${position}`}>
            <div className="tooltip-message">{message}</div>
          </div>
          )}
          <span
            className="tooltip-trigger"
            onMouseOver={this.showTooltip}
          >
            {this.props.children}
          </span>
        </span>
      </span>
    );
  }
}
