import { command, react, RichEmbed } from '@popcorn.moe/migi'
import fetch from 'node-fetch'

export default class XKCD {
	@command(/^xkcd(?:\s+latest)?$/)
	@react('👌')
	async latest({ channel }) {
		const embed = await this.xkcd()
		await channel.send({ embed })
	}

	@command(/^xkcd\s+(\d+)$/)
	@react('👌')
	async byId({ channel }, id) {
		const embed = await this.xkcd(id)
		await channel.send({ embed })
	}

	@command(/^xkcd\s+random$/)
	@react('👌')
	async random({ channel }) {
		const { num: maxId }= await fetch(`http://xkcd.com/info.0.json`).then(res => res.json())
		const embed = await this.xkcd(Math.floor(Math.random() * maxId))
		await channel.send({ embed })
	}

	async xkcd(id) {
		const { title, alt, img, day, month, year, num } = await fetch(`https://xkcd.com${id ? `/${id}` : ''}/info.0.json`)
			.then(res => res.json())
		const date = new Date()
		date.setFullYear(year, month - 1, day)
		date.setHours(0)
		date.setMinutes(42)
		date.setSeconds(0)
		date.setMilliseconds(0)
		return new RichEmbed()
			.setTitle(title)
			.setURL(`https://xkcd.com/${num}/`)
			.setDescription(alt)
			.setImage(img)
			.setColor(0x96A8C8)
			.setTimestamp(date)
	}
}