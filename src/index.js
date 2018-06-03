import Migi from '@popcorn.moe/migi'
import * as modules from './modules'
import { blue, green, magenta } from 'chalk'
import { join } from 'path'

const migi = new Migi({
	root: join(__dirname, '..')
})

Object.entries(modules).forEach(([name, Module]) => {
	migi.loadModule(Module)
	console.log(blue(`Starting module ${green.bold(name)}!`))
})

migi.login(process.env.DISCORD_TOKEN).catch(e => console.error(e, 'Login error!'))

migi.on('ready', () => {
	console.log(magenta(`Ready ${green.bold('@' + migi.user.tag)}!`))
	migi.user.setActivity("commands", { type: "LISTENING" })
})

//catch exits
process.on('exit', () => {
	migi.destroy()
})

//catch ctrl+c event and exit normally
process.on('SIGINT', () => {
	process.exit(2)
})

//catch uncaught exceptions, and exit normally
process.on('uncaughtException', err => {
	console.log(err)
	process.exit(99)
})

//catch rejected promises
process.on('unhandledRejection', err => {
	console.log(err)
})
