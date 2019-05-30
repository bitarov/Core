/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import { LogEvent, LogMiddleware } from 'core/log/middlewares';
import { LogEngine } from 'core/log/engines';

export class LogPipeline {
	private engine!: LogEngine;
	private middlewares!: LogMiddleware[];
	private middlewareIndex: number = 0;

	constructor(engine: LogEngine, middlewares: LogMiddleware[]) {
		this.engine = engine;
		this.middlewares = middlewares;
	}

	/**
	 * Carries events through the chain of middlewares and passes them to the engine in the end
	 * @param events
	 */
	run(events: LogEvent | LogEvent[]): void {
		this.middlewareIndex = 0;
		this.next(events);
	}

	private next(events: LogEvent | LogEvent[]): void {
		if (this.middlewares[this.middlewareIndex] !== undefined) {
			this.middlewareIndex++;
			this.middlewares[this.middlewareIndex].exec(events, this.next);

		} else {
			if (Array.isArray(events)) {
				for (let i = 0; i < events.length; ++i) {
					this.engine.log(events[i]);
				}

			} else {
				this.engine.log(events);
			}
		}
	}
}
