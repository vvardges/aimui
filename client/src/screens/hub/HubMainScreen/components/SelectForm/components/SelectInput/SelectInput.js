import './SelectInput.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as _ from 'lodash';

import UI from '../../../../../../../ui';
import { classNames, flattenObject } from '../../../../../../../utils';
import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';
import * as storeUtils from '../../../../../../../storeUtils';
import * as classes from '../../../../../../../constants/classes';
import ContentLoader from 'react-content-loader';

class SelectInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      offsetStep: 25,
      dropdownIsOpen: false,
      progress: null,
      suggestionsPrefix: null,
    };

    this.dropdownRef = React.createRef();
    this.selectInputRef = React.createRef();
    this.timerId;
    this.availableFlatFields = [];
  }

  componentDidMount() {
    document.addEventListener('keydown', this.escapePressHandler);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.dropdownIsOpen && !prevState.dropdownIsOpen) {
      this.incProgress();
      this.props.getProjectParams().then((data) => {
        this.completeProgress();
      });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timerId);
    document.removeEventListener('keydown', this.escapePressHandler);
  }

  escapePressHandler = (evt) => {
    if (evt.key === 'Escape') {
      const isNotCombinedKey = !(evt.ctrlKey || evt.altKey || evt.shiftKey);
      if (isNotCombinedKey) {
        if (this.state.dropdownIsOpen) {
          this.blurSelectInput();
        }
      }
    }
  };

  incProgress = () => {
    clearTimeout(this.timerId);
    this.setState((state) =>
      state.progress > 90
        ? null
        : {
          progress:
              state.progress === null
                ? 0
                : state.progress + Math.round(Math.random() * 10),
        },
    );
    this.timerId = setTimeout(this.incProgress, 100);
  };

  completeProgress = () => {
    clearTimeout(this.timerId);
    this.setState({
      progress: 100,
    });
    this.timerId = setTimeout(() => {
      this.setState({
        progress: null,
      });
    }, 200);
  };

  handleInputFocus = (evt) => {
    this.setState({ dropdownIsOpen: true });
  };

  handleInputBlur = (evt) => {
    if (evt.relatedTarget !== this.dropdownRef?.current) {
      this.setState({ dropdownIsOpen: false });
    }
  };

  blurSelectInput = () => {
    this.selectInputRef.current?.inputRef?.current?.blur();
  };

  getSelectedAttrs = () => {
    const selectVal = this.context.searchInput.selectInput.trim();
    if (!selectVal.length) {
      return [];
    }

    const selectAttrs = selectVal.split(',').map((i) => i.trim());
    return selectAttrs;
  };

  selectAttribute = (attrName, replace = false, cb = null) => {
    replace =
      replace && !this.context.searchInput.selectInput.trim().endsWith(',');
    let selectedAttrs = this.getSelectedAttrs();
    if (selectedAttrs.indexOf(attrName) !== -1) {
      selectedAttrs = selectedAttrs.filter((i) => i !== attrName);
    } else {
      if (replace) {
        selectedAttrs.pop();
      }
      selectedAttrs.push(attrName);
    }
    selectedAttrs = _.uniq(selectedAttrs.filter((i) => !!i));

    const value = selectedAttrs.join(', ');
    this.context.setSearchInputState(
      {
        selectInput: value,
      },
      () => {
        // this.handleInputChange(value);
        this.resetSuggestionsPrefix();
      },
    );

    if (this.selectInputRef?.current) {
      this.selectInputRef.current.inputRef?.current?.focus();
    }

    if (cb !== null) {
      cb();
    }
  };

  updateSuggestionsPrefix = () => {
    if (!!this.context.searchInput.selectInput) {
      const lastItem = this.context.searchInput?.selectInput
        ?.split(',')
        .pop()
        ?.trim();
      if (lastItem === this.state.suggestionsPrefix) {
        return;
      }
      this.setState({
        suggestionsPrefix: !!lastItem ? lastItem : null,
      });
    } else {
      this.setState({
        suggestionsPrefix: null,
      });
    }
  };

  resetSuggestionsPrefix = () => this.setState({ suggestionsPrefix: null });

  selectParamsByPath = (params, path, baseMatched = false) => {
    Object.keys(params).forEach((i) => {
      if (i === path[0] || (path.length === 1 && i.startsWith(path[0]))) {
        if (path.length > 1) {
          this.selectParamsByPath(params[i], path.slice(1), true);
        }
      } else if (!baseMatched && params[i] !== true) {
        this.selectParamsByPath(params[i], path, false);
      } else {
        delete params[i];
      }
    });
  };

  deleteEmptyParams = (params) => {
    if (params === true) {
      return false;
    } else if (Object.keys(params).length === 0) {
      return true;
    } else {
      Object.keys(params).forEach((i) => {
        if (this.deleteEmptyParams(params[i])) {
          delete params[i];
        }
      });
      return Object.keys(params).length === 0;
    }
  };

  _renderMetrics = (metrics, replaceOnClick = false, itemOnClickCB = null) => {
    const selectedAttrs = this.getSelectedAttrs();

    return (
      <div className="SelectInput__dropdown__group">
        <div className="SelectInput__dropdown__group__item__row group">
          <div
            className="SelectInput__dropdown__group__item__placeholder"
            style={{
              flexBasis: `${this.state.offsetStep}px`,
            }}
          />
          <div className="SelectInput__dropdown__group__title">
            <div className="SelectInput__dropdown__group__title__placeholder" />
            <div className="SelectInput__dropdown__group__title__label">
              metrics
            </div>
          </div>
        </div>
        <div className="SelectInput__dropdown__group__body">
          {!!metrics &&
            metrics.map((metric) => (
              <div
                className={classNames({
                  SelectInput__dropdown__group__item: true,
                  selected: selectedAttrs.indexOf(metric) !== -1,
                })}
                key={`${metric}`}
                onClick={(evt) =>
                  this.selectAttribute(metric, replaceOnClick, itemOnClickCB)
                }
              >
                <div className="SelectInput__dropdown__group__item__icon__wrapper metric">
                  {selectedAttrs.indexOf(metric) !== -1 ? (
                    <UI.Icon i="done" />
                  ) : (
                    <div className="SelectInput__dropdown__group__item__icon__letter">
                      M
                    </div>
                  )}
                </div>
                <div
                  className={classNames({
                    SelectInput__dropdown__group__item__row: true,
                    name: true,
                    selected: selectedAttrs.indexOf(metric) !== -1,
                  })}
                >
                  <div
                    className="SelectInput__dropdown__group__item__placeholder"
                    style={{
                      flexBasis: `${this.state.offsetStep}px`,
                    }}
                  />
                  <div className="SelectInput__dropdown__group__item__name">
                    <span className="SelectInput__dropdown__group__item__name__short">
                      {metric}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  _renderParamItem = (
    paramKey,
    parentPath,
    selectedAttrs,
    replaceOnClick,
    itemOnClickCB,
  ) => {
    const param = `${parentPath.join('.')}.${paramKey}`;

    return (
      <div
        className={classNames({
          SelectInput__dropdown__group__item: true,
          selected: selectedAttrs.indexOf(param) !== -1,
        })}
        key={param}
        onClick={(evt) =>
          this.selectAttribute(param, replaceOnClick, itemOnClickCB)
        }
      >
        <div className="SelectInput__dropdown__group__item__icon__wrapper param">
          {selectedAttrs.indexOf(param) !== -1 ? (
            <UI.Icon i="done" />
          ) : (
            <div className="SelectInput__dropdown__group__item__icon__letter">
              P
            </div>
          )}
        </div>
        <div className="SelectInput__dropdown__group__item__row name">
          {[...Array(parentPath.length)].map((_, i) => (
            <div
              className="SelectInput__dropdown__group__item__placeholder"
              key={i}
              style={{
                flexBasis: `${this.state.offsetStep}px`,
              }}
            />
          ))}
          <div className="SelectInput__dropdown__group__item__name">
            <span className="SelectInput__dropdown__group__item__name__short">
              {paramKey}
            </span>
            <span className="SelectInput__dropdown__group__item__name__full">
              {param}
            </span>
          </div>
        </div>
      </div>
    );
  };

  _renderParams = (
    params,
    parentPath = [],
    replaceOnClick = false,
    itemOnClickCB = null,
  ) => {
    const selectedAttrs = this.getSelectedAttrs();

    return (
      !!params &&
      Object.keys(params).map((paramKey) => (
        <>
          {typeof params[paramKey] === 'boolean' &&
            this._renderParamItem(
              paramKey,
              parentPath,
              selectedAttrs,
              replaceOnClick,
              itemOnClickCB,
            )}

          {typeof params[paramKey] === 'object' && (
            <div
              className="SelectInput__dropdown__group"
              key={`${parentPath.join('.')}.${paramKey}`}
            >
              <div className="SelectInput__dropdown__group__item__row group">
                {[...Array(parentPath.length + 1)].map((_, i) => (
                  <div
                    className="SelectInput__dropdown__group__item__placeholder"
                    key={i}
                    style={{
                      flexBasis: `${this.state.offsetStep}px`,
                    }}
                  />
                ))}
                <div className="SelectInput__dropdown__group__title">
                  <div className="SelectInput__dropdown__group__title__placeholder" />
                  <div className="SelectInput__dropdown__group__title__label">
                    {paramKey}
                  </div>
                </div>
              </div>
              <div className="SelectInput__dropdown__group__body">
                {this._renderParams(
                  params[paramKey],
                  [...parentPath, paramKey],
                  replaceOnClick,
                  itemOnClickCB,
                )}
              </div>
            </div>
          )}
        </>
      ))
    );
  };

  _renderSuggestions = () => {
    if (!this.state.suggestionsPrefix?.trim()) {
      return null;
    }

    const suggestionsPrefix = this.state.suggestionsPrefix.trim();

    const metrics = [];
    this.props.project?.metrics?.map(
      (m) => m.startsWith(suggestionsPrefix) && metrics.push(m),
    );

    const params = _.cloneDeep(this.props.project?.params) ?? {};
    this.selectParamsByPath(params, suggestionsPrefix.split('.'));
    this.deleteEmptyParams(params);

    return (
      <div className="SelectInput__dropdown__suggestions">
        <UI.Text
          className="SelectInput__dropdown__title"
          type="primary"
          overline
          bold
        >
          Search
        </UI.Text>
        {!!metrics?.length &&
          this._renderMetrics(metrics, true, this.resetSuggestionsPrefix)}
        {!!metrics?.length && !!params && Object.keys(params).length > 0 && (
          <div className="SelectInput__dropdown__divider" />
        )}
        {!!params &&
          this._renderParams(params, [], true, this.resetSuggestionsPrefix)}
        {metrics?.length === 0 && Object.keys(params).length === 0 && (
          <UI.Text type="grey" spacing spacingTop center>
            No options
          </UI.Text>
        )}
      </div>
    );
  };

  _renderSelectedFields = () => {
    const availableFields = [
      ...(this.props.project?.metrics ?? []),
      ...(this.props.project?.params
        ? Object.keys(flattenObject(this.props.project?.params))
        : []),
    ];

    const selectedFields = this.getSelectedAttrs()?.filter(
      (v, i, self) => !!v.length && self.indexOf(v) === i,
    );

    if (!selectedFields || !selectedFields.length) {
      return null;
    }

    return (
      <div className="SelectInput__dropdown__selected">
        <UI.Text
          className="SelectInput__dropdown__title"
          type="primary"
          overline
          bold
        >
          Selected fields
        </UI.Text>
        <div className="SelectInput__dropdown__selected__items">
          {selectedFields.map(
            (f, i) =>
              availableFields.indexOf(f) !== -1 && (
                <UI.Label
                  className="SelectInput__dropdown__selected__item"
                  key={i}
                  iconRight={<UI.Icon i="close" />}
                  iconOnClick={() => this.selectAttribute(f)}
                  iconIsClickable
                  outline
                >
                  {f}
                </UI.Label>
              ),
          )}
        </div>
      </div>
    );
  };

  _renderContentLoader = () => {
    const cellHeight = 15,
      cellWidth = 25,
      marginX = 10,
      marginY = 10;
    const colsTemplates = [
      [1, 7, 1],
      [1, 12, 1],
      [1, 16, 1],
      [1, 20, 1],
    ];

    return (
      <ContentLoader
        width={600}
        height={300}
        backgroundColor="#F3F3F3"
        foregroundColor="#ECEBEB"
      >
        {[
          [-1, 0],
          [-1, 3],
          [-1, 1],
          [-1, 2],
          [-1, 2],
          [-1, 0],
          [-1, 1],
          [-1, 3],
          [-1, 0],
          [-1, 0],
        ].map((rowMeta, rowIdx) => (
          <>
            {colsTemplates[rowMeta[1]]
              .slice(0, rowMeta[0])
              .map((colSize, colIdx) => (
                <rect
                  key={`${rowIdx}-${colIdx}`}
                  x={
                    colIdx
                      ? colsTemplates[rowMeta[1]]
                        .slice(0, colIdx)
                        .reduce((a, b) => a + b) *
                          cellWidth +
                        (colIdx + 1) * marginX
                      : marginX
                  }
                  y={rowIdx * (cellHeight + marginY) + marginY}
                  rx={5}
                  ry={5}
                  width={colSize * cellWidth}
                  height={cellHeight}
                />
              ))}
          </>
        ))}
      </ContentLoader>
    );
  };

  handleInputChange = (value) => {
    this.context.setSearchInputState(
      {
        selectInput: value,
      },
      () => setTimeout(this.updateSuggestionsPrefix, 200),
    );
  };

  render() {
    return (
      <div className="SelectInput">
        <UI.Input
          className={classNames({
            SelectForm__form__row__input: true,
            SelectInput__input: true,
            active: this.state.dropdownIsOpen,
          })}
          classNameWrapper="SelectForm__form__row__input__wrapper"
          placeholder="What to select.. e.g. `loss, acc, hparams.lr"
          onFocus={this.handleInputFocus}
          onBlur={this.handleInputBlur}
          onKeyPress={(evt) => {
            if (evt.charCode === 13) {
              this.props.search();
              this.blurSelectInput();
            }
          }}
          onChange={(evt) => this.handleInputChange(evt.target?.value)}
          value={this.context.searchInput.selectInput}
          ref={this.selectInputRef}
          tabIndex={1}
        />
        {this.state.dropdownIsOpen && (
          <div
            className={classNames({
              SelectInput__dropdown: true,
              open: true,
            })}
            tabIndex={0}
            ref={this.dropdownRef}
          >
            <div
              className="SelectInput__dropdown__body"
              onClick={() =>
                this.selectInputRef.current.inputRef?.current?.focus()
              }
            >
              {this.state.progress !== null && (
                <div
                  className="SelectInput__dropdown__body__loader"
                  style={{
                    width: `${this.state.progress}%`,
                  }}
                />
              )}
              {this.props.project.params === null ||
              this.props.project.metrics === null ? (
                  this._renderContentLoader()
                ) : (
                <>
                  {this._renderSuggestions()}
                  {this._renderSelectedFields()}
                  <UI.Text
                    className="SelectInput__dropdown__title"
                    type="primary"
                    overline
                    bold
                  >
                    Available fields
                  </UI.Text>
                  {!!this.props.project?.metrics?.length &&
                    this._renderMetrics(this.props.project.metrics)}
                  {!!this.props.project?.metrics?.length &&
                    !!this.props.project?.params &&
                    Object.keys(this.props.project?.params).length > 0 && (
                    <div className="SelectInput__dropdown__divider" />
                  )}
                  {!!this.props.project?.params &&
                    this._renderParams(this.props.project.params)}
                  {this.props.project?.metrics?.length === 0 &&
                    Object.keys(this.props.project?.params).length === 0 && (
                      <UI.Text type="grey" spacing spacingTop center>
                        Empty
                      </UI.Text>
                    )}
                </>
                )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

SelectInput.propTypes = {};

SelectInput.contextType = HubMainScreenContext;

export default storeUtils.getWithState(
  classes.EXPLORE_PARAMS_SELECT_INPUT,
  SelectInput,
);
