import { command, RichEmbed } from '@popcorn.moe/migi'
import runKitEval from './runkit'
import tioEval, { fetchTIOLanguages } from './tio'

function transformOutput(output) {
	const { type, value, properties } = output;

	switch(type) {
		case 'string':
			return '```javascript\n"' + value + '"```'
		case 'undefined':
			return '```apache\nundefined```'
		case 'function':
			return '```' + Object.values(properties).map(({ key, value }) => `${key} = ${value.value || value.type}`).join("\n") + '```'
		default:
			return '```javascript\n' + value + '```'
	}
}

export default class Eval {
	constructor() {
		this.tioLanguages = fetchTIOLanguages()
	}

	@command(/^eval\s*```([^\n]*)\n(.*)```$/s)
	async eval({ channel }, lang, code) {
		if (lang === 'javascript' || lang === 'js') {
			const outputs = await runKitEval(code)
			const embed = new RichEmbed()
				.setTitle(`Eval javascript with RunKit`)
				.setDescription(
					outputs.map(transformOutput).join('\n').slice(0, 2048)
				)
			channel.send({ embed })
		} else {
			const found = Object.keys(await this.tioLanguages).filter(e => e.startsWith(lang))[0]
			const results = await tioEval(found, code)
			const embed = new RichEmbed()
				.setTitle(`Eval ${found} with TIO`)
				.setDescription(
					results.map(res => '```' + res.join('\n') + '```').join('\n').slice(0, 2048)
				)

			channel.send({ embed })
		}
	}

	@command(/^languages$/)
	async languages({ channel }) {
		channel.send(Object.keys(await this.tioLanguages).join(', '))
	}
}