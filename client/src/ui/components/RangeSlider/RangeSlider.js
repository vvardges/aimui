import './RangeSlider.less';

import React from 'react';
import PropTypes from 'prop-types';
import Slider from 'react-rangeslider';
import 'react-rangeslider/lib/index.css';

import { classNames } from '../../utils';

class RangeSlider extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value,
    };
    this.value = this.props.value;
  }

  handleChange = (value) => {
    this.value = value;
    this.setState({ value });
  };

  handleChangeComplete = () => {
    if (this.props.onChange) {
      this.props.onChange(this.value);
    }
  };

  render() {
    let className = classNames({
      RangeSlider: true,
      [this.props.className]: !!this.props.className,
    });

    let ticks = {};
    if (!!this.props.ticks) {
      ticks = this.props.ticks;
    } else {
      Array(6)
        .fill(0)
        .forEach((_, i) => {
          const value = Math.round(
            ((this.props.max - this.props.min) / 5) * i + this.props.min,
          );
          ticks[value] = value;
        });
    }

    return (
      <div className='RangeSlider__wrapper'>
        <Slider
          className={className}
          min={this.props.min}
          max={this.props.max}
          value={this.state.value}
          handleLabel={`${this.state.value}`}
          labels={ticks}
          onChange={this.handleChange}
          onChangeComplete={this.handleChangeComplete}
          tooltip={false}
        />
      </div>
    );
  }
}

RangeSlider.defaultProps = {
  min: 0,
  max: 100,
  value: 50,
  ticks: null,
};

RangeSlider.propTypes = {
  min: PropTypes.number,
  max: PropTypes.number,
  value: PropTypes.number,
  ticks: PropTypes.object,
  onChange: PropTypes.func,
};

export default RangeSlider;
