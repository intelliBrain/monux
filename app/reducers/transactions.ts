import { Reducer, ReducersMapObject } from 'redux'

import { EActions } from '../actions/index'
import {
  ISetTransactionsAction,
  IAddTransactionAction,
  IAddTransactionsAction,
  IUpdateTransactionsAction
} from '../actions'
import { ITransactionsState } from '../store'

const initialState: ITransactionsState = []

export const reducer: Reducer<ITransactionsState> = (
  state = initialState,
  action
) => {
  const types = {
    [EActions.SET_TRANSACTIONS]: (
      state: ITransactionsState,
      action: ISetTransactionsAction
    ) => {
      return action.transactions as ITransactionsState
    },
    [EActions.ADD_TRANSACTION]: (
      state: ITransactionsState,
      action: IAddTransactionAction
    ) => {
      return [...state, action.transaction] as ITransactionsState
    },
    [EActions.ADD_TRANSACTIONS]: (
      state: ITransactionsState,
      action: IAddTransactionsAction
    ) => {
      return [...state, ...action.transactions] as ITransactionsState
    },
    [EActions.UPDATE_TRANSACTION]: (
      state: ITransactionsState,
      action: IUpdateTransactionsAction
    ) => {
      const txFilter = state.filter(tx => {
        return tx.id !== action.transaction.id
      })

      return [...txFilter, action.transaction] as ITransactionsState
    }
  } as ReducersMapObject

  return action.type in types ? types[action.type](state, action) : state
}

export default reducer
