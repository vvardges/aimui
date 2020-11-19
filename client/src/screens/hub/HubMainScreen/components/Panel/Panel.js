import './Panel.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import PanelChart from './components/PanelChart/PanelChart';
import ParallelCoordinatesChart from './components/ParallelCoordinatesChart/ParallelCoordinatesChart';
import UI from '../../../../../ui';

class Panel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      width: null,
      height: null,
    };

    this.panelRef = React.createRef();

    this.gridSize = 12;
    this.templates = {
      // Grid size: 12x12; Cell props: [w, h]
      0: [],
      1: [[12, 12]],
      2: [[6, 12], [6, 12]],
      3: [[6, 6], [6, 6], [12, 6]],
      4: [[6, 6], [6, 6], [6, 6], [6, 6]],
      5: [[4, 6], [4, 6], [4, 6], [6, 6], [6, 6]],
      6: [[4, 6], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6]],
      7: [[4, 6], [4, 6], [4, 6], [3, 6], [3, 6], [3, 6], [3, 6]],
      8: [[4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [6, 4], [6, 4]],
      9: [[4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4]],
    };
  }

  componentDidMount() {
    this.setSize();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (Math.abs(this.panelRef.current.clientHeight - this.state.height) > 4
      || Math.abs(prevProps.parentHeight - this.props.parentHeight) > 4
      || Math.abs(prevProps.parentWidth - this.props.parentWidth) > 4) {
      this.handleResize();
    }
  }

  handleResize = () => {
    this.setSize();
  };

  setSize = () => {
    const height = this.panelRef.current.clientHeight;
    const width = this.panelRef.current.clientWidth;

    this.setState({
      height,
      width,
    });
  };

  _renderPanelMsg = (Elem) => {
    return (
      <div className='Panel__msg__wrapper'>
        {Elem}
      </div>
    );
  };

  _renderCharts = () => {
    if (this.props.indices === null || this.props.indices.length === 0) {
      return null;
    }

    if (!this.props.parentHeight || this.state.height === null || this.state.width === null) {
      return null;
    }

    const widthFr = (this.state.width - 1) / this.gridSize;
    const heightFr = (this.state.height - 1) / this.gridSize;

    // FIXME: Display all the charts
    const indices = this.props.indices.slice(0, Math.min(9, this.props.indices.length));

    return (
      <>
        {indices?.map(i =>
          <div
            className='Panel__chart-wrapper'
            key={i}
            style={{
              width: this.templates[indices.length][i][0] * widthFr,
              height: this.templates[indices.length][i][1] * heightFr,
            }}
          >
            {this.context.runs?.meta?.params_selected
              ? <ParallelCoordinatesChart key={this.context.key} index={i} />
              : <PanelChart key={this.context.key} index={i} />
            }
          </div>
        )}
      </>
    )
  };

  render() {
    return (
      <div className='Panel' ref={this.panelRef}>
        {this.props.resizing ? (
          <div className='Panel__resizing'>
            <UI.Text type='primary' center>Release to resize</UI.Text>
          </div>
        ) : this.context.runs.isLoading
          ? (
            this.context.search.query.indexOf('tf:') === -1
              ? this._renderPanelMsg(<UI.Text type='grey' center>Loading..</UI.Text>)
              : this._renderPanelMsg(<UI.Text type='grey' center>Loading tf.summary logs can take some time..</UI.Text>)
          )
          : <>
            {this.context.runs.isEmpty
              ? this._renderPanelMsg(
                <>
                  {!!this.context.search.query
                    ? <UI.Text type='grey' center>You haven't recorded experiments matching this query.</UI.Text>
                    : <UI.Text type='grey' center>It's super easy to search Aim experiments.</UI.Text>
                  }
                  <UI.Text type='grey' center>
                    Lookup
                    {' '}
                    <a
                      className='link'
                      href='https://github.com/aimhubio/aim#searching-experiments'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      search docs
                    </a>
                    {' '}
                    to learn more.
                  </UI.Text>
                </>
              )
              : (
                this.context.enableExploreParamsMode() && this.context.getCountOfSelectedParams() === 1
                  ? this._renderPanelMsg(<UI.Text type='grey' center>Please select two or more fields to display parallel coordinates plot.</UI.Text>)
                  : this._renderCharts()
              )
            }
          </>
        }
      </div>
    );
  }
}

Panel.defautlProps = {
  parentHeight: null,
  parentWidth: null,
  resized: false,
  indices: null,
};

Panel.propTypes = {
  parentHeight: PropTypes.number,
  parentWidth: PropTypes.number,
  resized: PropTypes.bool,
  indices: PropTypes.array,
};

Panel.contextType = HubMainScreenContext;

export default Panel;