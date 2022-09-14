import React from 'react';

export default function LeaveWarning() {
  return (
    <div style={{
      width: '100vw', height: '100vh', zIndex: 50, position: 'absolute', top: 0, left: 0, backgroundColor: 'red', color: 'black',
    }}
    >
      <br />
      <br />
      <br />
      <br />
      <p style={{ fontSize: 55 }}>
        YOU WILL
        {' '}
        <b>LOSE YOUR PRIVATE KEYS AND FUNDS</b>
        {' '}
        IF YOU DO NOT SAVE THEM.
      </p>
      <p style={{ fontSize: 30 }}>
        Please be sure to save your keys before closing the DEX webpage. If you have not, please cancel nagivating away, and click the button below
        to export your data.
      </p>
      <p>
        {/* eslint-disable-next-line react/button-has-type */}
        <button style={{ fontSize: 40 }}>Export my wallet data</button>
      </p>
    </div>
  );
}
