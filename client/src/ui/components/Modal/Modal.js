import React, {useEffect, useRef} from 'react';
import ReactDOM from 'react-dom';
import './Modal.less';

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = event => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
    
      handler(event);
    };
    
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, []);
}

function Modal({toggle, children, footer}) {
  const ref = useRef();
  useOnClickOutside(ref, () => toggle(false));

  return ReactDOM.createPortal(
    <>
      <div className="modal__backdrop"/>
      <div className="modal">
        <div className="modal__content" ref={ref}>
          <div className="modal__body">
            {children}
          </div>
          <div className="modal__footer">
            {footer}
          </div>
        </div>
      </div>
    </>,
    document.querySelector('body')
  );
}

export default Modal;