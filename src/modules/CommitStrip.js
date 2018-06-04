import { command, react, RichEmbed } from '@popcorn.moe/migi'
import fetch from 'node-fetch'
import { escape } from 'querystring'
import cheerio from 'cheerio'

export default class CommitStrip {
	@command(/^commitstrip(?:\s+(en|fr))?(\s+search)?\s+(.*)$/)
	@react('👌')
	async search({ channel }, lang = 'en', search, query) {
		if (!search && query === 'latest')
			return;
		const [res] = await fetch(`http://www.commitstrip.com/${lang}/wp-json/wp/v2/posts?search=${escape(query)}`)
				.then(res => res.json())
		if (!res)
			await channel.send('Sorry, no commitstrip found')
		else
			await channel.send({ embed: CommitStrip.toEmbed(res) })
	}

	@command(/^commitstrip(?:\s+(en|fr))?\s+latest$/)
	@react('👌')
	async latest({ channel }, lang = 'en') {
		const [res] = await fetch(`http://www.commitstrip.com/${lang}/wp-json/wp/v2/posts?per_page=1`)
				.then(res => res.json())
		await channel.send({ embed: CommitStrip.toEmbed(res) })
	}

	static toEmbed({ title: { rendered: title }, content: { rendered: content }, link, date }) {
		const $ = cheerio.load(content)

		return new RichEmbed()
			.setTitle(title)
			.setImage($('img.alignnone.size-full').attr('src'))
			.setURL(link)
			.setColor(0x2B456F)
			.setTimestamp(new Date(date))
	}
}