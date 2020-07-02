import React from 'react';

export default function InfoIcon(props) {
  return (
    <img
      alt={props.alt}
      width={props.width}
      onClick={props.onClick}
      style={{ cursor: props.cursor || 'default', marginBottom: props.marginBottom || '0px' }}
      src="data:image/png;base64,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"
    />
  );
}
