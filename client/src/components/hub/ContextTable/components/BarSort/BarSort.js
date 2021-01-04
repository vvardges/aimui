import './BarSort.less';

import React, { useRef, useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  classNames,
  flattenObject,
  removeObjectEmptyKeys,
  searchNestedObject,
  excludeObjectPaths,
} from '../../../../../utils';
import UI from '../../../../../ui';
import * as _ from 'lodash';

function BarSort({ sortFields, setSortFields, maxHeight, fields }) {
  let [opened, setOpened] = useState(false);
  let [searchInput, setSearchInput] = useState('');

  let popupRef = useRef();
  let searchRef = useRef();

  useEffect(() => {
    if (opened) {
      popupRef.current?.focus();
      searchRef.current?.inputRef?.current?.focus();
    } else {
      setSearchInput('');
    }
  }, [opened]);

  // Parameters
  // TODO: add metrics as well
  const paramFields = _.cloneDeep(fields.params.deepParamFields);
  const paramFieldsPaths = [];
  Object.keys(flattenObject(paramFields)).forEach((paramPath) => {
    paramFieldsPaths.push(`params.${paramPath}`);
    _.set(paramFields, paramPath, true);
  });
  searchNestedObject(paramFields, searchInput.split('.'));
  sortFields
    .map((f) => f[0].replace('params.', ''))
    .forEach((paramPath) => {
      _.set(paramFields, paramPath, false);
    });
  removeObjectEmptyKeys(paramFields);

  function handleFieldToggle(path, order = 'asc') {
    let updSortFields = [...sortFields];
    if (updSortFields.findIndex((field) => field[0] === path) > -1) {
      if (order === 'remove') {
        updSortFields = updSortFields.filter((field) => field[0] !== path);
      } else if (
        order !== updSortFields.findIndex((field) => field[0] === path)[1]
      ) {
        updSortFields = updSortFields.map((field) =>
          field[0] === path ? [field[0], order] : field,
        );
      }
    } else {
      updSortFields.push([path, order]);
    }
    updSortFields = _.uniqBy(
      updSortFields.filter((f) => !!f[0]),
      '[0]',
    );
    setSortFields(updSortFields);
  }

  const styles = {};
  if (!!maxHeight && maxHeight < 300) {
    styles.maxHeight = `${maxHeight}px`;
  }

  return (
    <div className='ContextTableBar__item__wrapper'>
      {opened && (
        <div
          className='ContextTableBar__item__popup BarSort'
          tabIndex={0}
          ref={popupRef}
          style={styles}
          onBlur={(evt) => {
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
          {paramFieldsPaths.length ? (
            <div className='BarSort__content'>
              <div className='BarSort__body'>
                {sortFields.length > 0 && (
                  <div className='BarSort__selected'>
                    <UI.Text type='primary' overline bold>
                      Sorted by
                    </UI.Text>
                    {sortFields.map((field, i) => (
                      <div key={field[0]} className='BarSort__selected__item'>
                        <div
                          className='BarSort__selected__item__close'
                          onClick={() => handleFieldToggle(field[0], 'remove')}
                          onMouseMove={(evt) =>
                            (evt.currentTarget.parentNode.style.backgroundColor =
                              'var(--grey-bg)')
                          }
                          onMouseOut={(evt) =>
                            (evt.currentTarget.parentNode.style.backgroundColor =
                              'inherit')
                          }
                        >
                          <UI.Icon i='close' />
                        </div>
                        <UI.Text
                          small
                          className='BarSort__selected__item__field'
                        >
                          <span title={field[0]}>{field[0]}</span>
                        </UI.Text>
                        <div className='BarSort__selected__item__order'>
                          <span
                            className={classNames({
                              BarSort__selected__item__order__item: true,
                              active: field[1] === 'asc',
                            })}
                            onClick={
                              field[1] === 'asc'
                                ? null
                                : () => handleFieldToggle(field[0], 'asc')
                            }
                          >
                            <UI.Text small>asc</UI.Text>
                          </span>
                          <span
                            className={classNames({
                              BarSort__selected__item__order__item: true,
                              active: field[1] === 'desc',
                            })}
                            onClick={
                              field[1] === 'desc'
                                ? null
                                : () => handleFieldToggle(field[0], 'desc')
                            }
                          >
                            <UI.Text small>desc</UI.Text>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className='BarSort__form__wrapper'>
                  <UI.Input
                    className='BarSort__input'
                    value={searchInput}
                    onChange={(evt) => setSearchInput(evt.target.value)}
                    placeholder='Search fields...'
                    size='small'
                    ref={searchRef}
                  />
                </div>
                <div className='BarSort__parameters__box'>
                  {!!paramFields && Object.keys(paramFields).length ? (
                    <Parameters
                      params={paramFields}
                      parentPath={[]}
                      sortFields={sortFields}
                      toggleField={handleFieldToggle}
                    />
                  ) : (
                    <UI.Text type='grey' spacingTop spacing center small>
                      No options
                    </UI.Text>
                  )}
                </div>
              </div>
              <div className='BarSort__footer'>
                <div className='BarSort__actions'>
                  <UI.Button
                    className='BarSort__action'
                    type='negative'
                    size='tiny'
                    disabled={sortFields.length === 0}
                    onClick={() => setSortFields([])}
                  >
                    Reset sorting
                  </UI.Button>
                </div>
              </div>
            </div>
          ) : (
            <UI.Text type='grey' spacingTop center small>
              No options
            </UI.Text>
          )}
        </div>
      )}
      <div
        className={classNames({
          ContextTableBar__item__label: true,
          active: opened || (!!sortFields && sortFields.length),
        })}
        onClick={() => setOpened(!opened)}
      >
        <UI.Icon i='import_export' scale={1.2} />
        <span className='ContextTableBar__item__label__text'>
          {!!sortFields && sortFields.length
            ? `Sorted by ${sortFields.length} field${
                sortFields.length > 1 ? 's' : ''
              }`
            : 'Sort'}
        </span>
      </div>
    </div>
  );
}

BarSort.defaultProps = {
  sortFields: [],
  setSortFields: null,
  maxHeight: null,
  fields: {
    params: {},
    metrics: [],
  },
};

BarSort.propTypes = {
  sortFields: PropTypes.array,
  setSortFields: PropTypes.func,
  maxHeight: PropTypes.number,
  fields: PropTypes.object,
};

function Parameter({ paramKey, parentPath, toggleField }) {
  const path = `params.${parentPath.join('.')}.${paramKey}`;

  return (
    <div
      className={classNames({
        BarSort__group__item: true,
      })}
      key={path}
      onClick={() => toggleField(path)}
    >
      <div className='BarSort__group__item__radio__wrapper'>
        <UI.Icon i='import_export' />
      </div>
      <div className='BarSort__group__item__row name'>
        {[...Array(parentPath.length)].map((_, i) => (
          <div className='BarSort__group__item__placeholder' key={i} />
        ))}
        <div className='BarSort__group__item__name' title={path}>
          {paramKey}
        </div>
      </div>
    </div>
  );
}

function Parameters({ params, parentPath, sortFields, toggleField }) {
  const key = (k) => `${parentPath.join('.')}.${k}`;
  const unselectedParams =
    !!params &&
    Object.keys(params)
      .filter((paramKey) => {
        const path = `params.${parentPath.join('.')}.${paramKey}`;
        const off = sortFields.findIndex((field) => field[0] === path) === -1;
        return off;
      })
      .sort();

  return unselectedParams?.map((paramKey) => (
    <Fragment key={key(paramKey)}>
      {typeof params[paramKey] === 'boolean' && (
        <Parameter
          paramKey={paramKey}
          parentPath={parentPath}
          toggleField={toggleField}
        />
      )}
      {typeof params[paramKey] === 'object' &&
        Object.keys(params[paramKey]).filter((key) => {
          const path = `params.${paramKey}.${key}`;
          const off = sortFields.findIndex((field) => field[0] === path) === -1;
          return off;
        }).length > 0 && (
        <div className='BarSort__group' key={key(paramKey)}>
          <div className='BarSort__group__item__row group'>
            {[...Array(parentPath.length + 1)].map((_, i) => (
              <div className='BarSort__group__item__placeholder' key={i} />
            ))}
            <div className='BarSort__group__title'>
              <div className='BarSort__group__title__placeholder' />
              <div className='BarSort__group__title__label'>{paramKey}</div>
            </div>
          </div>
          <div className='BarSort__group__body'>
            <Parameters
              key={key(paramKey)}
              params={params[paramKey]}
              parentPath={[...parentPath, paramKey]}
              sortFields={sortFields}
              toggleField={toggleField}
            />
          </div>
        </div>
      )}
    </Fragment>
  ));
}

export default BarSort;
