import { command, RichEmbed } from '@popcorn.moe/migi'
import fetch from 'node-fetch'
import cheerio from 'cheerio'

// TODO: http://www.monkeyuser.com/2017/http-status-codes-community/
const wcStatus = {
	301: "https://i.imgur.com/phxOw1D.png",
	305: "https://i.imgur.com/GPdDoXM.png",
	307: "https://i.imgur.com/TgcOvCN.png",
	400: "https://i.imgur.com/oj9v9NX.png",
	404: "http://www.monkeyuser.com/assets/images/2017/23-http-status-codes-alt-1.png",
	408: "https://i.imgur.com/tT5zB7X.png",
	410: "http://www.monkeyuser.com/assets/images/2017/23-http-status-codes-alt-5.png",
	413: "https://i.imgur.com/ctBvQUN.png",
	417: "https://i.imgur.com/3OP85fU.png",
	418: "http://www.monkeyuser.com/assets/images/2017/23-http-status-codes-alt-2.png",
	429: "http://www.monkeyuser.com/assets/images/2017/23-http-status-codes-alt-4.png",
	500: "https://i.imgur.com/3OP85fU.png"
}

export default class HTTP {
	constructor() {
		this.statuses = (async () => {
			const body = await fetch("https://en.wikipedia.org/wiki/List_of_HTTP_status_codes")
				.then(res => res.text())
			const $ = cheerio.load(body)
			const data = {}
			$('.reference').remove()
			$('dt > span').each((i, e) => {
				const el = $(e)
				const status = parseInt(el.attr('id'))
				data[status] = {
					name: el.parent().text(),
					description: el.parent().nextAll().first().text()
				}
			})
			return data;
		})()
	}
	@command(/^http status(?: (cat|dog|wc))? (\d+)$/)
	async status({ channel }, type = 'cat', status) {
		const statuses = await this.statuses
		if (status in statuses) {
			const { name, description } = statuses[status]
			const embed = new RichEmbed()
				.setTitle(name)
				.setURL(`http://en.wikipedia.org/wiki/List_of_HTTP_status_codes#${status}`)
				.setDescription(description)
			if (status >= 100 && status < 400) {
				embed.setColor(0x4CAF50)
			} else if (status >= 400 && status < 500) {
				embed.setColor(0xFFC107)
			} else if (status >= 500 && status < 600) {
				embed.setColor(0xE53935)
			}
			switch (type) {
				case 'cat':
					embed.setImage(`https://http.cat/${status}`)
					embed.setFooter('Image from https://http.cat')
					break;
				case 'dog':
					embed.setImage(`https://httpstatusdogs.com/img/${status}.jpg`)
					embed.setFooter('Image from https://httpstatusdogs.com')
					break;
				case 'wc':
					embed.setImage(wcStatus[status])
					embed.setFooter('Image from http://www.monkeyuser.com')
					break;
			}
			channel.send({ embed })
		} else {
			channel.send(`HTTP Status code ${status} not found`)
		}
	}
}