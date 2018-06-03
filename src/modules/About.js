import { command, react } from '@popcorn.moe/migi'
import { RichEmbed } from 'discord.js'
import { fromUrl } from 'hosted-git-info'
import pretty from 'pretty-ms'

import { homepage, repository } from '../../package.json'

export default class About {

	@command(/^about$/)
	@react('👌')
	async about({ client, channel }) {
		const { name, id, owner, description, iconURL, botPublic } = await client.fetchApplication()
		const embed = new RichEmbed()
			.setTitle(`About ${name}`)
			.setDescription(description)
			.setThumbnail(iconURL)
			.addField('Owner', owner, true)
			.addField('Created at', client.user.createdAt.toDateString(), true)
			.addField('Public', botPublic ? 'yes' : 'no', true)
			.addField('Ping', pretty(client.ping), true)
			.addField('Uptime', pretty(client.uptime), true)
			.addField('Boot time', pretty((process.uptime() * 1000) - client.uptime), true)
			.addField('Guilds', client.guilds.size, true)
			.addField('Users', new Set(client.guilds.array().map(({ members }) => members.keyArray()).reduce((c,v) => c.concat(v), [])).size, true)
			.addField('Homepage', `[Click here](${homepage})`, true)
			.addField('Sources', `[Click here](${fromUrl(repository.url).browse()})`, true)
			.addField('Invite', `[Click here](https://discordapp.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=3072)`, true)
		
		channel.send({ embed })
	}
}