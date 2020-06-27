import React from 'react';
import './Modal.css';

export default function Modal (props) {
    const coverClass =  props.modalOpened ? 'modal-cover modal-cover-active' : 'modal-cover'
    const containerClass = props.modalOpened ? 'modal-container modal-container-active' : 'modal-container'
    return (
        <div>
            <div className={containerClass}>
                <div className='modal-header'/>
                <div className='modal-body'/>
                <div className='modal-footer'/>
            </div>
            <div className={coverClass} onClick={props.closeModal}/>
        </div>
    );
}