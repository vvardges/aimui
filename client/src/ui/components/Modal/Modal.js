import React from 'react';
import ReactDOM from 'react-dom';
import './Modal.less';

function Modal({toggle, children, footer}) {
  return ReactDOM.createPortal(
    <div className="Modal" onClick={toggle}>
      <div className="Modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="Modal__body">
          {children}
        </div>
        <div className="Modal__footer">
          {footer}
        </div>
      </div>
    </div>,
    document.querySelector('#root')
  );
}

export default Modal;