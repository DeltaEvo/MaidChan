import { deflateRaw, inflateRaw } from 'zlib';
import fetch from 'node-fetch'
import { randomBytes, createHash } from 'crypto'
import { promisify } from 'util';

const deflateRawAsync = promisify(deflateRaw)
const inflateRawAsync = promisify(inflateRaw)
const randomBytesAsync = promisify(randomBytes)

const TIO_BASE = "https://tio.run"
const TIO_RUN_URL = `${TIO_BASE}/cgi-bin/static/b666d85ff48692ae95f24a66f7612256-run`
const TIO_LANGUAGES_URL = `${TIO_BASE}/static/c6361f8606e8cee8f054d5005c3bbb59-languages.json`

function objectToString(object) {
	return `${Object.entries(object).map(([key, value]) => {
		if (Array.isArray(value)) {
			return `V${key}\0${value.length}\0${value.map(v => `${v}\0`).join('')}`
		} else {
			return `F${key}\0${value.length}\0${value}`
		}
	}).join('')}R`
}

export default async function tioEval(language, code) {
	const state = objectToString({
		lang: [language],
		'.code.tio': code,
		'.input.tio': '',
		args: []
	})

	const buffer = await fetch(`${TIO_RUN_URL}/${(await randomBytes(16)).toString('hex')}`, {
		method: 'POST',
		body: await deflateRawAsync(state)
	})
	.then(res => res.buffer())
	const response = (await inflateRawAsync(buffer.slice(10))).toString()
	return response.substr(16).split(response.substr(0, 16))
		.map(e => e.split('\n').filter(e => e.length))
		.filter(e => e.length)
}


export function fetchTIOLanguages() {
	return fetch(TIO_LANGUAGES_URL)
		.then(res => res.json())
}