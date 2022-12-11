import { BotEvent, EventManager } from '../EventManager';

const events: { [key: string]: BotEvent } = {
	event1: { '@': true, replies: ['Nothing', 'Something'] },
	event2: { replies: ['test01', 'test02'] },
};

describe('EventManager Tests', () => {
	const eventManager = new EventManager(events);

	it('should return the target event', () => {
		const event = eventManager.getEvent('event1');

		expect(event['@']).toEqual(true);
		expect(event).toEqual({ '@': true, replies: ['Nothing', 'Something'] });
	});
});
