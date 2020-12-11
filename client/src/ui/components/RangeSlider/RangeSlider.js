import './RangeSlider.less';

import React from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../utils';

class RangeSlider extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value,
    };
  }

  handleChange = (evt) => {
    let newValue = evt.target.value;

    this.setState({ value: newValue });

    if (this.props.onChange) {
      this.props.onChange(newValue);
    }
  };

  render() {
    let className = classNames({
      RangeSlider: true,
      [this.props.className]: !!this.props.className,
    });

    return (
      <div className="RangeSlider__wrapper">
        <input
          className={className}
          type="range"
          min={this.props.min}
          max={this.props.max}
          value={this.state.value}
          onChange={(evt) => this.handleChange(evt)}
        />
      </div>
    );
  }
}

RangeSlider.defaultProps = {
  min: 0,
  max: 100,
  value: 50,
};

RangeSlider.propTypes = {
  min: PropTypes.number,
  max: PropTypes.number,
  value: PropTypes.number,
  onChange: PropTypes.func,
};

export default RangeSlider;
