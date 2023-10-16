import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

ReactDOM.render(React.createElement(App), document.getElementById('root'));

window.onbeforeunload = (e) => {
  e = e || window.event;
  const message = 'Are you sure you want to leave the page, your session may get lost';
  e.preventDefault();
  e.returnValue = message;
  return message;
};
