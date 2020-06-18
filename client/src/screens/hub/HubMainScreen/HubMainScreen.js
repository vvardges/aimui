import './HubMainScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as classes from '../../../constants/classes';
import * as storeUtils from '../../../storeUtils';
import UI from '../../../ui';
import ControlPanel from './components/ControlPanel/ControlPanel';
import SearchBar from './components/SearchBar/SearchBar';


class HubMainScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
  }

  render() {
    return (
      <ProjectWrapper>
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <UI.Container size='standard' ref={this.contentRef}>
          <SearchBar />
          <ControlPanel data={Object.values(this.props.data)} />
        </UI.Container>
      </ProjectWrapper>
    )
  }
}

export default storeUtils.getWithState(
  classes.HUB_MAIN_SCREEN,
  HubMainScreen
);