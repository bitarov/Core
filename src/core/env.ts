/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import { GLOBAL } from 'core/const/links';
import { asyncLocal } from 'core/kv-storage';
import { EventEmitter2 as EventEmitter } from 'eventemitter2';

export const
	event = new EventEmitter({maxListeners: 1e3}),
	storage = asyncLocal.namespace('[[ENV]]');

/**
 * Returns settings from the app environment by the specified key
 * @param key
 */
export function get(key: string): Promise<Dictionary | undefined> {
	return storage.get(key);
}

/**
 * Added settings to the app environment by the specified key
 *
 * @param key
 * @param value
 */
export function set(key: string, value: Dictionary): void {
	storage.set(key, value).catch(stderr);
	event.emit(`set.${key}`, value);
}

/**
 * Removes settings from the app environment by the specified key
 * @param key
 */
export function remove(key: string): void {
	storage.remove(key).catch(stderr);
	event.emit(`remove.${key}`);
}

GLOBAL.envs = storage;
GLOBAL.getEnv = (key) => get(key).then(console.log);
GLOBAL.setEnv = set;
GLOBAL.removeEnv = remove;