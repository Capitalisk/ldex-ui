import React from 'react';
import logo from './logo.svg';
import './DimensionsCheck.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { width: window.innerWidth, height: window.innerHeight };
  }

  componentDidMount() {
    window.addEventListener('resize', this.update);
  }

  update = () => {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Hello world! Your width is
            {' '}
            {this.state.width}
            {' '}
            and your height is
            {' '}
            {this.state.height}
            .
          </p>
        </header>
      </div>
    );
  }
}

export default App;
