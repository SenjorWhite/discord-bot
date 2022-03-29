const { Client, Intents } = require('discord.js');
const { channelId, guildId, token } = require('./config.json');
const { commands, triggers, events } = require('./replies.json');
const fs = require('fs');
const _ = require('lodash');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
	console.log('Ready!');
});

client.on('messageCreate', async (message) => {
	if (channelId.includes(message.channelId) || guildId.includes(message.guildId)) {
		console.log(message.content);
		handleEvent(message);
	}
});

client.login(token);

async function handleEvent(message) {
	if (commands[message.content]) {
		if (commands[message.content] === 'ListTriggers') {
			const reply = Object.keys(triggers);
			message.channel.send(reply.toString());
			console.log(`${message.author} / ${message.author.username} : ${message.content} => ${reply}`);
		}
	} else if (triggers[message.content]) {
		const event = events[triggers[message.content]];
		const replies = event.replies;
		let reply;
		let authorized = false;

		if (event.guild) {
			if (event.guild.includes(message.guildId)) {
				authorized = true;
			}
		}

		if (event.channel) {
			if (event.channel.includes(message.channelId)) {
				authorized = true;
			}
		}

		if (!event.guild && !event.channel) {
			authorized = true;
		}

		if (!authorized) {
			return;
		}

		if (event.gacha) {
			const gachaMap = initializeGacha(event);

			if (event['daily-limit']) {
				const filePath = `\\db\\${triggers[message.content]}.json`;
				if (!event.limitList) {
					const fileExists = fs.existsSync(filePath);
					if (fileExists) {
						event.limitList = JSON.readFileSync(fs.readFileSync(filePath));
						fs.writeFileSync(`\\db\\${triggers[message.content]}.json`, JSON.stringify({}));
					}

					event.limitList = {};
				}

				if (event.limitList[message.clientId]) {
					// over limit
				} else if (!event.limitList[message.clientId]) {
					// add record to db
				}
			}

			reply = _.sample(event.pool[_.sample(gachaMap)].items);
			// console.log(gachaMap);
		} else if (!event.gacha) {
			if (Array.isArray(replies)) {
				reply = _.sample(replies);
			} else if (!Array.isArray(replies)) {
				if (event.replies[message.author]) {
					reply = _.sample(event.replies[message.author]);
				} else if (event.replies.common) {
					reply = _.sample(event.replies.common);
				} else {
					console.error('Format error!');
					return;
				}
			} else {
				console.error('Format error!');
				return;
			}
		}

		if (event.tag) {
			reply = `${event.tag} ${reply}`;
		}

		if (event['@']) {
			await message.reply(reply);
		} else {
			await message.channel.send(reply);
		}

		console.log(`${message.author} / ${message.author.username} : ${message.content} => ${reply}`);
	}
}

function initializeGacha(event) {
	const gachaMap = [];
	let index = 0;
	for (let i = 0; i < event.pool.length; i++) {
		const element = event.pool[i];
		if (element.rarity > 0) {
			for (let j = 0; j < element.rarity; j++) {
				gachaMap[index + j] = i;
			}
			index += element.rarity;
		} else if (element.rarity === -1) {
			for (let j = index; j < 1000; j++) {
				gachaMap[j] = i;
			}
		}
	}
	return gachaMap;
}
