import './Header.less';

import React from 'react';
import { NavLink, withRouter } from 'react-router-dom';

import { classNames } from '../../../utils';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';


class Header extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  render() {
    const className = classNames({
      Header: true,
    });

    return (
      <>
        <div className={className}>
          <div className='Header__cont'>
            <div className='Header__items top'>
              <div className='Header__item__wrapper'>
                <div className='Header__item'>
                  <div className='Header__item__img' />
                </div>
              </div>
              <div className='Header__item__wrapper'>
                <NavLink exact to={screens.MAIN}>
                  <div className='Header__item'>
                    <UI.Icon i='nc-preferences' className='Header__item__icon' />
                    <UI.Text className='Header__item__title'>Panel</UI.Text>
                  </div>
                </NavLink>
              </div>
              <div className='Header__item__wrapper'>
                <NavLink exact to={screens.HUB_PROJECT_EXPERIMENT_INDEX}>
                  <div className='Header__item'>
                    <UI.Icon i='nc-layers-3' className='Header__item__icon' />
                    <UI.Text className='Header__item__title'>Runs</UI.Text>
                  </div>
                </NavLink>
              </div>
              <div className='Header__item__wrapper'>
                <NavLink to={screens.HUB_PROJECT_TAGS}>
                  <div className='Header__item'>
                    <UI.Icon i='nc-flag-points-32' className='Header__item__icon' />
                    <UI.Text className='Header__item__title'>Tags</UI.Text>
                  </div>
                </NavLink>
              </div>
              <div className='Header__item__wrapper'>
                <NavLink to={screens.HUB_PROJECT_EXECUTABLES}>
                  <div className='Header__item'>
                    <UI.Icon i='nc-archive-2' className='Header__item__icon' />
                    <UI.Text className='Header__item__title'>Processes</UI.Text>
                  </div>
                </NavLink>
              </div>
            </div>
            <div className='Header__items bottom'>
              <div className='Header__item__wrapper'>
                <a className='link' href='https://docs.aimstack.io' target='_blank' rel='noreferrer noopener'>
                  <div className='Header__item'>
                    <UI.Icon i='nc-single-folded-content' className='Header__item__icon' />
                    <UI.Text className='Header__item__title'>Docs</UI.Text>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
}

export default withRouter(storeUtils.getWithState(
  classes.HEADER,
  Header
));