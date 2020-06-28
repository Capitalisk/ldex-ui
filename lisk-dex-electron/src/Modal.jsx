import React from 'react';
import './Modal.css';

export default function Modal (props) {
    const coverClass =  props.modalOpened ? 'modal-cover modal-cover-active' : 'modal-cover'
    const containerClass = props.modalOpened ? 'modal-container modal-container-active' : 'modal-container'
    return (
        <div>
            <div className={containerClass}>
                <div className='modal-header'>
                    {props.header}
                </div>
                <div className='modal-body'>
                    {props.children}
                </div>
                <div className='modal-footer'>
                    {props.footer}
                </div>
            </div>
            <div className={coverClass} onClick={props.closeModal}/>
        </div>
    );
}