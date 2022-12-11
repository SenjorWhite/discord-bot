import { Client, Intents, Message, MessageActionRow, MessageButton, ThreadChannel } from 'discord.js';
import { channelId, guildId, token } from './config.json';
import { commands, exception, triggers, events } from './replies.json';
import * as process from 'process';
import * as fs from 'fs';
import * as _ from 'lodash';

import { BotEvent } from './components/EventManager';

let eventRecords;

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

async function handleEvent(message: Message) {
	if (commands[message.content]) {
		if (commands[message.content] === 'ListTriggers') {
			const reply = Object.keys(triggers);
			message.channel.send(reply.toString());
			console.log(`${message.author} / ${message.author.username} : ${message.content} => ${reply}`);
		}
	} else if (triggers[message.content]) {
		const event = events[triggers[message.content]] as BotEvent;
		const eventName: string = triggers[message.content];
		const replies = event.replies;
		let sentMessage: Message;
		let available = true;
		let reply;
		let authorized = false;
		let row;

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

		if (event['daily-limit']) {
			const lastRecord = getLastEventRecord(eventName, message.author);

			if (lastRecord !== null && lastRecord !== undefined) {
				const lastTime = new Date(lastRecord);
				const eventResetTime = getEventResetTime(lastTime, event['reset-time']);
				eventResetTime.setHours(event['reset-time'], 0, 0, 0);
				const now = new Date();
				console.log(`${message.author} lastTime: ${lastTime}, resetTime: ${eventResetTime}, now: ${now}`);
				if (Date.now() < eventResetTime.getTime()) {
					available = false;
				}
			}

			if (!available) {
				reply = _.sample(event['limit-message']);
			}
		}

		if (event['invite-to-thread']) {
			const threads = event['invite-to-thread'];
			const threadNames = Object.keys(threads);

			if (threadNames.length > 0) {
				row = new MessageActionRow();

				threadNames.forEach((name) => {
					row.addComponents(new MessageButton().setCustomId(name).setLabel(name).setStyle('PRIMARY'));
				});

				const collector = message.channel.createMessageComponentCollector({ time: event['available-time'] });

				collector.on('collect', async (i) => {
					if (threads[i.customId]) {
						const threadId = threads[i.customId];
						await i.deferUpdate();
						const thread = (await client.channels.fetch(threadId)) as ThreadChannel;
						thread.members.add(i.user.id);
					}
				});
			}
		}

		if ((event['daily-limit'] && available) || !event['daily-limit']) {
			if (event['daily-limit']) {
				setLastEventRecord(eventName, message.author, Date.now());
			}

			if (event.gacha) {
				const gachaMap = initializeGacha(event);
				reply = _.sample(event.pool[_.sample(gachaMap)].items);
			} else if (!event.gacha) {
				if (Array.isArray(replies)) {
					reply = _.sample(replies);
				} else if (!Array.isArray(replies)) {
					if (event.replies[message.author.toString()]) {
						reply = _.sample(event.replies[message.author.toString()]);
					} else if (!_.isArray(event.replies)) {
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
		}

		if (event.tag) {
			reply = `${event.tag} ${reply}`;
		}

		if (!reply || reply === '') {
			reply = exception;
		}

		if (event['@']) {
			if (row) {
				sentMessage = await message.reply({ content: reply, components: [row] });
			} else {
				sentMessage = await message.reply(reply);
			}
		} else {
			if (row) {
				sentMessage = await message.channel.send({ content: reply, components: [row] });
			} else {
				sentMessage = await message.channel.send(reply);
			}
		}

		if (event.files) {
			await message.channel.send({ files: event.files });
		}

		if (event['invite-to-thread']) {
			row.components.forEach((component) => {
				component.setDisabled(true);
			});

			setTimeout(() => {
				sentMessage.edit({ content: event['invite-expired-msg'], components: [row] });
			}, event['available-time']);
		}

		console.log(`${message.author} / ${message.author.username} : ${message.content} => ${reply}`);
	}
}

function getEventResetTime(eventTime, resetTime) {
	const eventResetTime = new Date(eventTime);
	eventResetTime.setHours(resetTime, 0, 0, 0);

	if (eventTime > eventResetTime.getTime()) {
		eventResetTime.setDate(eventResetTime.getDate() + 1);
	}

	return eventResetTime;
}

function getLastEventRecord(eventName, userId) {
	let event = null;

	if (!eventRecords) {
		eventRecords = {};
		if (fs.existsSync('./event-records.json')) {
			eventRecords = JSON.parse(fs.readFileSync('./event-records.json').toString());
		}
	}

	if (eventRecords[eventName]) {
		if (eventRecords[eventName][userId]) {
			event = eventRecords[eventName][userId];
		}
	}

	return event;
}

function setLastEventRecord(eventName, userId, record) {
	if (eventRecords[eventName]) {
		eventRecords[eventName][userId] = record;
	} else if (!eventRecords[eventName]) {
		eventRecords[eventName] = {};
		eventRecords[eventName][userId] = record;
	}

	return eventRecords[eventName][userId];
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

process.on('exit', exitHandler);

process.on('SIGINT', exitHandler);

function exitHandler() {
	if (eventRecords) {
		const eventData = JSON.stringify(eventRecords);
		fs.writeFileSync('./event-records.json', eventData);
	}
	process.exit();
}
