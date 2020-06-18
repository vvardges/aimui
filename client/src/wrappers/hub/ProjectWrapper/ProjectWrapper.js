import './ProjectWrapper.less';

import React from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, Redirect } from 'react-router-dom';

import * as screens from '../../../constants/screens';
import * as classes from '../../../constants/classes';
import UI from '../../../ui';
import HubWrapper from '../HubWrapper/HubWrapper';
import * as storeUtils from '../../../storeUtils';
import { buildUrl, classNames } from '../../../utils';


class ProjectWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      notFound: false,
    };
  }

  componentWillMount() {
    this.props.resetProjectState();
  }

  componentDidMount() {
    this.props.getProject().then((data) => {
      this.props.incProgress();
    }).catch(() => {
      this.setState( {
        notFound: true,
      });
    });
  }

  render() {
    let project = this.props.project;

    if (this.props.isLoading) {
      return null;
    }

    if (this.state.notFound) {
      return (
        <Redirect to={screens.NOT_FOUND} />
      )
    }

    return (
      <HubWrapper gap={false}>
        <div className='ProjectWrapper'>
          <div className='ProjectWrapper__header'>
            <UI.Container size='small'>
              <div className='ProjectWrapper__breadcrumb'>
                <Link
                  to={screens.MAIN}
                >
                  <UI.Text size={5}>{project.name}</UI.Text>
                </Link>
              </div>
              <div className='ProjectWrapper__navbar__wrapper'>
                <nav className='ProjectWrapper__navbar'>
                  <NavLink
                    to={screens.MAIN}
                    className={classNames({
                      ProjectWrapper__navbar__item: true,
                    })}
                    exact
                  >
                    <UI.Icon i='nc-preferences' scale={1} spacingRight />
                    Panel
                  </NavLink>
                  <NavLink
                    to={screens.HUB_PROJECT_EXPERIMENT_INDEX}
                    className={classNames({
                      ProjectWrapper__navbar__item: true,
                      active: !!this.props.experimentName,
                    })}
                    exact
                  >
                    <UI.Icon i='nc-folder-15' scale={1} spacingRight />
                    Experiments
                  </NavLink>
                  <NavLink
                    to={screens.HUB_PROJECT_TAGS}
                    className={classNames({
                      ProjectWrapper__navbar__item: true,
                    })}
                  >
                    <UI.Icon i='nc-flag-points-32' scale={1} spacingRight />
                    Tags
                  </NavLink>
                  <NavLink
                    to={screens.HUB_PROJECT_EXECUTABLES}
                    className={classNames({
                      ProjectWrapper__navbar__item: true,
                    })}
                  >
                    <UI.Icon i='nc-archive-2' scale={1} spacingRight />
                    Processes
                  </NavLink>
                </nav>
              </div>
            </UI.Container>
          </div>
          <div className='ProjectWrapper__body'>
            {!!this.props.navigation &&
              <div className='ProjectWrapper__navigation'>
                {React.cloneElement(this.props.navigation, {
                  contentWidth: this.props.contentWidth,
                })}
              </div>
            }
            <div className='ProjectWrapper__cont' ref={this.contentRef}>
              {this.props.children}
            </div>
          </div>
        </div>
      </HubWrapper>
    )
  }
}

ProjectWrapper.propTypes = {
  experimentName: PropTypes.string,
  navigation: PropTypes.node,
  contentWidth: PropTypes.number,
};

export default storeUtils.getWithState(
  classes.HUB_PROJECT_WRAPPER,
  ProjectWrapper
);