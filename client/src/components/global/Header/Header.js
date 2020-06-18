import './Header.less';

import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import LoadingBar from 'react-top-loading-bar';

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
          <div className='LoadingBar__wrapper'>
            <LoadingBar
              height={3}
              color='#7A94CC'
              progress={this.props.loadProgress}
              className='LoadingBar'
            />
          </div>
          <UI.Container>
            <div className='Header__cont'>
              <div className='Header__items'>
                <Link to={screens.MAIN}>
                  <div className='Header__item logo' />
                </Link>
              </div>
              <div className='Header__items'>
                <a className='Header__item clickable' href='https://docs.aimhub.io' target='_blank' rel='noreferrer noopener'>
                  Docs
                </a>
              </div>
            </div>
          </UI.Container>
        </div>
      </>
    )
  }
}

export default withRouter(storeUtils.getWithState(
  classes.HEADER,
  Header
));