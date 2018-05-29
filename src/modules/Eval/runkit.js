import WebSocket from 'ws';
import deserialize from "@isomorphic/serialize/from-object-serialization";
import { parse } from '@babel/parser';
import traverse from "babel-traverse";
import uuid from 'uuid/v4'
import { createHash } from 'crypto'

function stringify(o) {
	return JSON.stringify(o, (key, value) => {
		if (!["start", "end", "loc", "raw", "rawValue", "UUID", "comments", "leadingComments", "trailingComments"].includes(key))
			return value
	})
}

function sha1(value) {
	const generator = createHash('sha1')
	generator.update(value)
	return generator.digest('hex')
}

function transformAst(ast, code) {
	delete ast.program.sourceType
	delete ast.program.interpreter
	traverse(ast, {
		enter({ node }) {
			switch (node.type) {
				case 'VariableDeclaration':
					const { declarations: [declaration] } = node
					node.kind = code.substring(node.start, declaration.start).trim()
					break;
				case 'ArrowFunctionExpression':
				case 'FunctionDeclaration':
					// Key order
					var { type, id, generator, ...rest } = node;
					Object.keys(node).forEach(key => delete node[key])
					node.type = type
					node.id = id
					node.generator = generator
					node.expression = code[rest.body.start] !== '{'
					Object.assign(node, rest)
					break;
				case 'ObjectProperty':
					// Key order
					var { type, method, shorthand, computed, key, ...rest } = node;
					Object.keys(node).forEach(key => delete node[key])
					node.type = type
					node.method = method
					node.shorthand = shorthand
					node.computed = computed
					node.key = key
					Object.assign(node, rest)
					break;
			}
		}
	})
	return ast
}

function extractFromAst(ast) {
	const hoistedVariableNames = []
	const hoistedTDZVariableNames = []
	const hoistedFunctionDeclarations = []
	const packages = []
	for (const node of ast.program.body) {
		switch(node.type) {
			case 'VariableDeclaration':
				const { declarations: [{ id: { name }}] } = node
				if(node.kind === "var")
					hoistedVariableNames.push(name)
				else
					hoistedTDZVariableNames.push(name)
				break;
			case 'FunctionDeclaration':
				hoistedFunctionDeclarations.push(node)
				break;
		}
	}
	traverse(ast, {
		enter({ node }) {
			if (node.type === 'CallExpression' && node.callee.name === 'require')
				packages.push(node.arguments[0].value)
		}
	})
	hoistedVariableNames.sort()
	hoistedTDZVariableNames.sort()
	hoistedFunctionDeclarations.sort((a,b) => a.id.name.localeCompare(b.id.name))
	return {
		hoistedVariableNames,
		hoistedTDZVariableNames,
		hoistedFunctionDeclarations,
		packages
	}
}

export default function runKitEval(code) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket('wss://runkit.com/', {
			headers: {
				origin: 'https://runkit.com',
			}
		})

		let started = false
		let runIdentifier
		let closeTimeout

		const outputChecksums = new Map()
		const outputs = []
		const time = new Date().getTime()
		const evaluationUUID = uuid()
		const ast = transformAst(parse(code, {
			allowAwaitOutsideFunction: true,
			allowReturnOutsideFunction: true
		}), code)
		const { hoistedVariableNames, hoistedTDZVariableNames, hoistedFunctionDeclarations, packages } = extractFromAst(ast)

		const meta = stringify({
			nodeVersion: "8.11.1",
			nodeFlags: [],
			program: ast.program,
			evaluationUUID,
			hoistedVariableNames,
			hoistedTDZVariableNames,
			hoistedFunctionDeclarations
		})

		const checksum = sha1(sha1(meta))

		ws.on('message', msg => {
			const { name, href, contents } = JSON.parse(msg)

			switch (name) {
				case 'initialize':
					ws.send(JSON.stringify({ 
						name: "href-registration",
						hrefs: [
							{ href: "/embed/new?hostURL=", preloaded: false }
						]
					}))
					break;
				case 'href-update':
					switch(href) {
						case '/embed/new?hostURL=':
							const { accessKey, identifier } = contents;
							runIdentifier = identifier;

							ws.send(JSON.stringify({
								name: "evaluate",
								url: `/embed/${identifier}?access-key=${accessKey}`,
								dependencies: packages.reduce((c,v) => (c[v] = time, c), {}),
								nodeVersion: "8.x.x",
								environmentOverrides: [{ name: "RUNKIT_ENDPOINT_URL", value: `https://${identifier}.runkit.sh` }],
								evaluationUUIDs: ["0"],
								sources: [
									{
										evaluationUUID,
										type: "source",
										text: code,
										packages: packages.reduce((c, v) => (c[v] = true, c), {}),
										'result-checksum': checksum
									}
								]
							}))
							ws.send(JSON.stringify({ 
								name: "href-registration",
								hrefs: [
									{ href: `/embed/${identifier}/outputs/${checksum}`, preloaded: false },
									{ href: `/embed/${identifier}/exception/0`, preloaded: false },
									{ href: `/embed/${identifier}/status/0`, preloaded: false }
								]
							}))
							break
						case `/embed/${runIdentifier}/status/0`:
							const { running } = contents;
							started |= running;

							if (started && outputChecksums.size === 0 && !running) {
								closeTimeout = setTimeout(() => {
									resolve(false)
									console.log("No output received closing")
									ws.close()
								}, 100);
							}
							break;
						case `/embed/${runIdentifier}/outputs/${checksum}`:
							if (!contents.items.length)
								break;

							closeTimeout && clearTimeout(closeTimeout)
							contents.items.forEach(({ outputValueChecksum, type }) => outputChecksums.set(outputValueChecksum, type ))
							ws.send(JSON.stringify({ 
								name: "href-registration",
								hrefs:  [...outputChecksums.keys()].map(c => ({ href: `/output-values/${c}`, preloaded: false }))
							}))
							break;
					}
					const sum = [...outputChecksums.keys()].findIndex(checksum => href === `/output-values/${checksum}`)
					if (sum !== -1) {
							const value = deserialize(contents)
							const type = [...outputChecksums.values()][sum]
							outputs[sum] = {
								value,
								type
							}
							if (outputs.filter(e => e).length === outputChecksums.size) {
								resolve(outputs)
								ws.close()
							}
					}
					break
			}
		});

		ws.on('error', reject)
	})
}