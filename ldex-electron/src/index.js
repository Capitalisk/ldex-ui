import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';


ReactDOM.render(React.createElement(App), document.getElementById('root'));

window.onbeforeunload = (e) => {
  e = e || window.event;
  const message = 'Are you sure you want to leave the page, your session may get lost';
  e.preventDefault();
  e.returnValue = message;
  return message;
};

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
