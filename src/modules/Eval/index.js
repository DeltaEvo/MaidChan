import { command, react, RichEmbed } from '@popcorn.moe/migi'
import runKitEval from './runkit'
import tioEval, { fetchTIOLanguages } from './tio'

function transformOutput(output) {
	const { type, value, properties, className } = output

	switch(type) {
		case 'string':
			return "```js\n'" + value.replace(/'/g, "\\'") + "'\n```"
		case 'undefined':
			return '```apache\nundefined```'
		case 'object':
		case 'function':
			const props = Object.values(properties)
			if (props.length)
				return '```js\n' + className + ' {\n'+ props.map(({ key, value }) => `\t${key}: ${value.value || `[${value.type}]`}`).join(",\n") + '\n}```'
			else
				return '```\n' + className + ' {}\n```'
		default:
			return '```js\n' + value + '```'
	}
}

export default class Eval {
	constructor() {
		this.tioLanguages = fetchTIOLanguages()
	}

	@command(/^eval\s*```([^\n]*)\n(.*)```$/s)
	@react('👌')
	async eval({ channel }, lang, code) {
		if (lang === 'javascript' || lang === 'js') {
			const outputs = await runKitEval(code)
			if (outputs) {
				const embed = new RichEmbed()
					.setTitle(`Eval javascript with RunKit`)
					.setDescription(
						outputs.map(({ value, type }) => type + ':\n' + transformOutput(value)).join('\n').slice(0, 2048)
					)
				return void await channel.send({ embed })
			} else {
				channel.send("Error could not evaluate code with RunKit")
				lang = 'javascript-node'
			}
		}
		const found = Object.keys(await this.tioLanguages).filter(e => e.startsWith(lang))[0]
		const results = await tioEval(found, code)
		const embed = new RichEmbed()
			.setTitle(`Eval ${found} with TIO`)
			.setDescription(
				results.map(res => '```\n' + res.join('\n') + '\n```').join('\n').slice(0, 2048)
			)

		await channel.send({ embed })
	}

	@command(/^languages$/)
	@react('👌')
	async languages({ channel }) {
		await channel.send(Object.keys(await this.tioLanguages).join(', '))
	}
}