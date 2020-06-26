import React from 'react';
import './Modal.css';

export default class Modal extends React.PureComponent {
    constructor (props) {
        super(props)

        this.state = {
            modalOpened: false
        }

        this.modalToggle = this.modalToggle.bind(this)
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        if (nextState.modalOpened !== this.state.modalOpened) {
            this.modalToggle();
            return true;
        }
        return false;
    }

    modalToggle () {
        this.setState({ modalOpened: !this.state.modalOpened })
    }

    render () {
        const coverClass = this.state.modalOpened ? 'modal-cover modal-cover-active' : 'modal-cover'
        const containerClass = this.state.modalOpened ? 'modal-container modal-container-active' : 'modal-container'
        return (
            <div>
                <div className={containerClass}>
                    <div className='modal-header'/>
                    <div className='modal-body'/>
                    <div className='modal-footer'/>
                </div>
                <div className={coverClass} onClick={this.modalToggle}/>
            </div>
        )
    }
}