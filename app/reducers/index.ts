import { combineReducers } from 'redux'

import { IState } from '../store'
import balance from './balance'
import spent from './spent'

export default combineReducers<IState>({
  balance,
  spent
})
