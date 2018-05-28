import { command } from '@popcorn.moe/migi'

export default class Base64 {
	@command(/^base64 encode (.*)$/)
	encode({ channel }, data) {
		channel.send('```\n' + Buffer.from(data).toString('base64') + '\n```')	
	}

	@command(/^base64 decode (.*)$/)
	decode({ channel }, data) {
		channel.send('```\n' + Buffer.from(data, 'base64').toString() + '\n```')	
	}
}