import './SidebarMenu.less';

import React, { useState, useRef, useEffect, useContext } from 'react';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';
import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';

function SidebarMenu() {
  let {
    resetControls, areControlsChanged,
  } = useContext(HubMainScreenContext);

  let [opened, setOpened] = useState(false);

  let popupRef = useRef();

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened]);

  return (
    <div className='ControlsSidebar__menu'>
      <UI.Tooltip
        tooltip={opened ? 'Hide menu' : 'Open menu'}
      >
        <div
          className={classNames({
            ControlsSidebar__menu__btn: true,
            active: opened,
          })}
          onClick={() => setOpened(!opened)}
        >
          {opened ? <UI.Icon i='close' /> : <UI.Icon i='menu' /> }
        </div>
      </UI.Tooltip>
      {opened && (
        <div
          className='ControlsSidebar__item__popup list'
          tabIndex={0}
          ref={popupRef}
          onBlur={evt => {
            const currentTarget = evt.currentTarget;
            if (opened) {
              window.setTimeout(() => {
                if (!currentTarget.contains(document.activeElement)) {
                  setOpened(false);
                }
              }, 100);
            }
          }}
        >
          <div className='ControlsSidebar__item__popup__header'>
            <UI.Text overline bold>Sidebar menu</UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__list'>
            <div
              className={classNames({
                ControlsSidebar__item__popup__list__item: true,
                text_normalized: true,
                disabled: !areControlsChanged(),
              })}
              onClick={resetControls}
            >
              <UI.Text small>Reset Controls to System Defaults</UI.Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SidebarMenu.propTypes = {};

export default SidebarMenu;