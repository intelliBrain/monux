import { applyMiddleware, createStore, Store, compose } from 'redux'

import { IAmountOptions, IMonzoApiTransaction } from '../lib/monzo'
import reducer from './reducers'
import middleware from './middleware'

export type IActivePaneState = string
export type IBalanceState = IAmountOptions
export type ISpentState = IAmountOptions
export type ITransactionsState = IMonzoApiTransaction[]
export type ISelectedTransactionsState = string
export interface IAccountState {
  name: string
  bank: string
}

export interface IState {
  activePane: IActivePaneState
  balance: IBalanceState
  spent: ISpentState
  account: IAccountState
  transactions: ITransactionsState
  selectedTransaction: ISelectedTransactionsState
}

interface ReduxWindow extends Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any
}

const composeEnhancers =
  (window as ReduxWindow).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

export const store: Store<IState> = createStore<IState>(
  reducer,
  composeEnhancers(applyMiddleware(...middleware))
)
export default store
