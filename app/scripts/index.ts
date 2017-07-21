import context = require('electron-contextmenu-middleware')
import imageMenu = require('electron-image-menu')

import store from '../store'
import { Amount } from '../../lib/monzo'

context.use(imageMenu)
context.activate()
