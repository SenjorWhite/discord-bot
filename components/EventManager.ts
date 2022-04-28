export type BotEvent = {
	guild?: string[];
	channel?: string[];
	gacha?: boolean;
	pool?: { rarity: number; items: string[] }[];
	replies?: string[] | { common: string[] };
	files?: string[];
	tag?: string;
	'@'?: boolean;
	'invite-expired-msg'?: string;
	'available-time'?: number;
	'invite-to-thread'?: object;
	'daily-limit'?: boolean;
	'reset-time'?: number;
};

export class EventManager {
	triggers: { [keys: string]: string } = {};
	events: { [keys: string]: BotEvent } = {};
	constructor(events: { [keys: string]: BotEvent }) {
		this.events = events;
	}

	public getEvent(key: string): BotEvent {
		return this.events[key];
	}
}
