import './SelectForm.less';

import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';

import SidebarMenu from './components/SidebarMenu/SidebarMenu';
import SelectInput from './components/SelectInput/SelectInput';
import UI from '../../../../../ui';
import { classNames } from '../../../../../utils';
import { HubMainScreenModel } from '../../models/HubMainScreenModel';

function SelectForm(props) {
  let history = useHistory();
  let { runs, searchInput } = HubMainScreenModel.useHubMainScreenState([
    HubMainScreenModel.events.SET_RUNS_STATE,
    HubMainScreenModel.events.SET_SEARCH_INPUT_STATE,
  ]);
  let { setSearchState, setSearchInputState } = HubMainScreenModel.emitters;

  function getFullQuery() {
    let query = searchInput.selectInput;
    if (!!searchInput.selectConditionInput) {
      query = `${query} if ${searchInput.selectConditionInput}`;
    }
    return query;
  }

  function search() {
    const query = getFullQuery();

    setSearchState(
      {
        query,
      },
      () => {
        props.searchByQuery();
      },
      true,
    );
  }
  return (
    <div className='SelectForm'>
      <div className='SelectForm__body'>
        <div className='SelectForm__form'>
          <div className='SelectForm__form__row'>
            <div className='SelectForm__form__row__title'>Select</div>
            <SelectInput search={search} />
          </div>
          <div className='SelectForm__form__row'>
            <div className='SelectForm__form__row__title'>If</div>
            <UI.Input
              className='SelectForm__form__row__input'
              classNameWrapper='SelectForm__form__row__input__wrapper'
              placeholder='e.g. `experiment in (nmt_syntok_dynamic, nmt_syntok_greedy) and hparams.lr >= 0.0001`'
              onChange={(evt) =>
                setSearchInputState({
                  selectConditionInput: evt.target.value,
                })
              }
              value={searchInput.selectConditionInput}
              tabIndex={2}
              onKeyPress={(evt) => {
                if (evt.charCode === 13) {
                  search();
                }
              }}
            />
          </div>
        </div>
        <div className='SelectForm__actions'>
          <div className='SelectForm__action__wrapper'>
            <div
              className={classNames({
                SelectForm__action: true,
                active: runs.isLoading,
                disabled: runs.isLoading,
              })}
              onClick={search}
            >
              <UI.Icon i='search' />
            </div>
          </div>
          <div className='SelectForm__action__wrapper'>
            <SidebarMenu className='SelectForm__action' />
          </div>
          <div className='SelectForm__action__wrapper'>
            <div
              className={classNames({
                SelectForm__action: true,
                disabled: runs.isLoading,
              })}
              onClick={history.goBack}
            >
              <UI.Icon i='arrow_back_ios_new' />
            </div>
          </div>
          <div className='SelectForm__action__wrapper'>
            <div
              className={classNames({
                SelectForm__action: true,
                disabled: runs.isLoading,
              })}
              onClick={history.goForward}
            >
              <UI.Icon i='arrow_forward_ios' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

SelectForm.propTypes = {};

export default React.memo(SelectForm);
