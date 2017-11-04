/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

/* tslint:disable:max-file-line-count */

/// <reference types="node"/>
import $C = require('collection.js');

export interface AsyncLink {
	id: any;
	obj: any;
	objName: string | undefined;
	label: string | symbol | undefined;
	onComplete: Function[][];
	onClear: Function[];
}

export interface ClearOpts {
	label?: string | symbol;
	group?: string | symbol | RegExp;
}

export interface ClearOptsId<T> extends ClearOpts {
	id?: T;
}

export interface AsyncOpts {
	join?: boolean | 'replace';
	label?: string | symbol;
	group?: string | symbol;
}

export type AsyncCtx = {
	type: string;
	link: AsyncLink;
	replacedBy?: AsyncLink;
} & AsyncOpts & ClearOptsId<any>;

export interface AsyncCbOpts extends AsyncOpts {
	onClear?: Function | Function[];
}

export interface AsyncCbOptsSingle extends AsyncCbOpts {
	single?: boolean;
}

export interface LocalCacheObject {
	labels: Record<string, any>;
	links: Map<any, any>;
}

export interface CacheObject {
	root: LocalCacheObject;
	groups: Record<string, LocalCacheObject>;
}

export interface EventEmitterLike {
	on?: Function;
	addListener?: Function;
	addEventListener?: Function;
	once?: Function;
	off?: Function;
	removeListener?: Function;
	removeEventListener?: Function;
}

export interface WorkerLike {
	terminate?: Function;
	destroy?: Function;
	close?: Function;
}

export type RequestLike<T> = PromiseLike<T> & {abort: Function};

export interface NodeEventCb {
	(e: Event, el: Node): void;
}

export interface NodeEventOpts {
	capture?: boolean;
	handler: NodeEventCb;
}

/**
 * Base class for Async IO
 *
 * @example
 * this.setImmediate(() => alert(1));                                // 1
 * this.setImmediate(() => alert(2), {label: 'foo'});                // -
 * this.setImmediate(() => alert(3), {label: 'foo'});                // 3, calls only last task with a same label
 * this.setImmediate(() => alert(4), {group: 'bar'});                // 4
 * this.setImmediate(() => alert(5), {label: 'foo', group: 'bar'});  // -
 * this.setImmediate(() => alert(6), {label: 'foo', group: 'bar'});  // 6
 */
export default class Async<CTX extends Object> {
	/**
	 * @param [ctx] - context for functions
	 */
	constructor(ctx?: CTX) {
		this.cache = Object.create(null);
		this.context = ctx;
	}

	/**
	 * Cache object for async operations
	 */
	protected cache: Record<string, CacheObject>;

	/**
	 * Context for functions
	 */
	protected context: CTX | undefined;

	/**
	 * Wrapper for setImmediate
	 *
	 * @param fn - callback function
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	setImmediate(fn: () => void, params?: AsyncCbOpts): number | NodeJS.Timer {
		return this.setAsync({
			...params,
			name: 'immediate',
			obj: fn,
			clearFn: clearImmediate,
			wrapper: setImmediate,
			linkByWrapper: true
		});
	}

	/**
	 * Wrapper for clearImmediate
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	clearImmediate(id?: number | NodeJS.Timer): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	clearImmediate(params: ClearOptsId<number | NodeJS.Timer>): this;

	// tslint:disable-next-line
	clearImmediate(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'immediate', clearFn: clearImmediate});
		}

		return this.clearAsync({
			...p,
			name: 'immediate',
			clearFn: clearImmediate,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for setInterval
	 *
	 * @param fn - callback function
	 * @param interval - interval value
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	setInterval(fn: () => void, interval: number, params?: AsyncCbOpts): number | NodeJS.Timer {
		return this.setAsync({
			...params,
			name: 'interval',
			obj: fn,
			clearFn: clearInterval,
			wrapper: setInterval,
			linkByWrapper: true,
			interval: true,
			args: [interval]
		});
	}

	/**
	 * Wrapper for clearInterval
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	clearInterval(id?: number | NodeJS.Timer): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	clearInterval(params: ClearOptsId<number | NodeJS.Timer>): this;

	// tslint:disable-next-line
	clearInterval(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'interval', clearFn: clearInterval});
		}

		return this.clearAsync({
			...p,
			name: 'interval',
			clearFn: clearInterval,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for setTimeout
	 *
	 * @param fn - callback function
	 * @param timer - timer value
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	setTimeout(fn: () => void, timer: number, params?: AsyncCbOpts): number | NodeJS.Timer {
		return this.setAsync({
			...params,
			name: 'timeout',
			obj: fn,
			clearFn: clearTimeout,
			wrapper: setTimeout,
			linkByWrapper: true,
			args: [timer]
		});
	}

	/**
	 * Wrapper for clearTimeout
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	clearTimeout(id?: number | NodeJS.Timer): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	clearTimeout(params: ClearOptsId<number | NodeJS.Timer>): this;

	// tslint:disable-next-line
	clearTimeout(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'timeout', clearFn: clearTimeout});
		}

		return this.clearAsync({
			...p,
			name: 'timeout',
			clearFn: clearTimeout,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for requestAnimationFrame
	 *
	 * @param fn - callback function
	 * @param [element] - link for the element
	 */
	requestAnimationFrame(fn: (timeStamp: number) => void, element?: HTMLElement): number;

	/**
	 * Wrapper for requestAnimationFrame
	 *
	 * @param fn - callback function
	 * @param params - parameters for the operation:
	 *   *) [element] - link for the element
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	requestAnimationFrame(fn: (timeStamp: number) => void, params: AsyncCbOpts & {element?: HTMLElement}): number;

	// tslint:disable-next-line
	requestAnimationFrame(fn, p) {
		return this.setAsync({
			...Object.isObject(p) ? p : undefined,
			name: 'animationFrame',
			obj: fn,
			clearFn: cancelAnimationFrame,
			wrapper: requestAnimationFrame,
			linkByWrapper: true,
			args: p && (this.getIfNotObject(p) || p.element)
		});
	}

	/**
	 * Wrapper for cancelAnimationFrame
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	cancelAnimationFrame(id?: number): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	cancelAnimationFrame(params: ClearOptsId<number>): this;

	// tslint:disable-next-line
	cancelAnimationFrame(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'animationFrame', clearFn: cancelAnimationFrame});
		}

		return this.clearAsync({
			...p,
			name: 'animationFrame',
			clearFn: cancelAnimationFrame,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for requestIdleCallback
	 *
	 * @param fn - callback function
	 * @param [params] - additional parameters for the operation:
	 *   *) [timeout] - timeout value for the native requestIdleCallback
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	requestIdleCallback(
		fn: (deadline: IdleDeadline) => void,
		params?: AsyncCbOpts & {timeout?: number}
	): number | NodeJS.Timer {
		return this.setAsync({
			...params && Object.reject(params, 'timeout'),
			name: 'idleCallback',
			obj: fn,
			clearFn: cancelIdleCallback,
			wrapper: requestIdleCallback,
			linkByWrapper: true,
			args: params && Object.select(params, 'timeout')
		});
	}

	/**
	 * Wrapper for cancelIdleCallback
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	cancelIdleCallback(id?: number | NodeJS.Timer): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	cancelIdleCallback(params: ClearOptsId<number | NodeJS.Timer>): this;

	// tslint:disable-next-line
	cancelIdleCallback(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'idleCallback', clearFn: cancelIdleCallback});
		}

		return this.clearAsync({
			...p,
			name: 'idleCallback',
			clearFn: cancelIdleCallback,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for workers: WebWorker, Socket and etc.
	 *
	 * @param worker
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	worker<T>(worker: T & WorkerLike, params?: AsyncCbOpts): T {
		return this.setAsync({
			...params,
			name: 'worker',
			obj: worker || this.getIfNotObject(params),
			clearFn: this.workerDestructor,
			interval: true
		});
	}

	/**
	 * Terminates the specified worker
	 * @param [worker] - link for the worker (if not defined wil be terminate all workers)
	 */
	terminateWorker<T>(worker?: T & WorkerLike): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - link for the worker
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	terminateWorker<T>(params: ClearOptsId<T & WorkerLike>): this;

	// tslint:disable-next-line
	terminateWorker(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'worker', clearFn: this.workerDestructor});
		}

		return this.clearAsync({
			...p,
			name: 'worker',
			clearFn: this.workerDestructor,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for a remote request
	 *
	 * @param request
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	request<T>(request: RequestLike<T>, params?: AsyncOpts): RequestLike<T> {
		return this.setAsync({
			...params,
			name: 'request',
			obj: request,
			clearFn: this.requestDestructor,
			wrapper: (fn, req) => req.then(fn, fn),
			needCall: true
		});
	}

	/**
	 * Отменяет заданный удаленный запрос
	 * @param [request] - запрос (если не задан, то удаляются все запросы)
	 */
	cancelRequest<T>(request?: RequestLike<T>): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - объект запроса
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	cancelRequest<T>(params: ClearOptsId<T & WorkerLike>): this;

	// tslint:disable-next-line
	cancelRequest(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'request', clearFn: this.requestDestructor});
		}

		return this.clearAsync({
			...p,
			name: 'request',
			clearFn: this.requestDestructor,
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for callback функции
	 *
	 * @param cb
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	proxy(cb: Function, params?: AsyncCbOpts): Function {
		return this.setAsync({
			...params,
			name: 'proxy',
			obj: cb,
			wrapper: (fn) => fn,
			linkByWrapper: true
		});
	}

	/**
	 * Cancels the specified callback function
	 * @param [cb] - link for the callback (if not defined will be remove all callbacks)
	 */
	cancelProxy<T>(cb?: Function): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - link for the callback
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	cancelProxy<T>(params: ClearOptsId<Function>): this;

	// tslint:disable-next-line
	cancelProxy(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'proxy'});
		}

		return this.clearAsync({
			...p,
			name: 'proxy',
			id: p.id || this.getIfNotObject(p)
		});
	}

	/**
	 * Wrapper for a promise
	 *
	 * @param promise
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	promise<T>(promise: PromiseLike<T>, params?: AsyncOpts): Promise<T> {
		return new Promise((resolve, reject) => {
			promise.then(
				<any>this.proxy(resolve, {
					...params,
					onClear: this.onPromiseClear(resolve, reject)
				}),

				reject
			);
		});
	}

	/**
	 * Promise for setTimeout
	 *
	 * @param timer
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	sleep(timer: number, params?: AsyncOpts): Promise<void> {
		return new Promise((resolve, reject) => {
			this.setTimeout(resolve, timer, {
				...params,
				onClear: this.onPromiseClear(resolve, reject)
			});
		});
	}

	/**
	 * Promise for setImmediate
	 *
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	nextTick(params?: AsyncOpts): Promise<void> {
		return new Promise((resolve, reject) => {
			this.setImmediate(resolve, {
				...params,
				onClear: this.onPromiseClear(resolve, reject)
			});
		});
	}

	/**
	 * Promise for requestIdleCallback
	 *
	 * @param [params] - additional parameters for the operation:
	 *   *) [timeout] - timeout value for the native requestIdleCallback
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	idle(params?: AsyncOpts & {timeout?: number}): Promise<IdleDeadline> {
		return new Promise((resolve, reject) => {
			this.requestIdleCallback(resolve, {
				...params,
				onClear: this.onPromiseClear(resolve, reject)
			});
		});
	}

	/**
	 * Promise for requestAnimationFrame
	 * @param [element] - link for the element
	 */
	animationFrame(element?: HTMLElement): Promise<number>;

	/**
	 * @param params - parameters for the operation:
	 *   *) [element] - link for the element
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 */
	animationFrame(params: AsyncCbOpts & {element?: HTMLElement}): Promise<number>;

	// tslint:disable-next-line
	animationFrame(p) {
		return new Promise((resolve, reject) => {
			this.requestAnimationFrame(resolve, {
				...Object.isObject(p) ? p : undefined,
				element: p && (this.getIfNotObject(p) || p.element),
				onClear: this.onPromiseClear(resolve, reject)
			});
		});
	}

	/**
	 * Waits until the specified function returns a positive value (== true)
	 *
	 * @param fn
	 * @param [params] - additional parameters for the operation:
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 */
	wait(fn: Function, params?: AsyncOpts): Promise<void> {
		const DELAY = 15;
		return new Promise((resolve, reject) => {
			let id;
			const cb = () => {
				if (fn()) {
					resolve();
					this.clearInterval(id);
				}
			};

			id = this.setInterval(cb, DELAY, {
				...params,
				onClear: this.onPromiseClear(resolve, reject)
			});
		});
	}

	/**
	 * Wrapper for an event emitter add listener
	 *
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param handler - event handler
	 * @param [args] - additional arguments for the emitter
	 */
	on<T>(emitter: T & EventEmitterLike, events: string | string[], handler: Function, ...args: any[]): Object;

	/**
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param handler - event handler
	 * @param params - parameters for the operation:
	 *   *) [options] - additional options for addEventListener
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [single] - если true, то после первого вызова события оно будет очищено
	 *   *) [onClear] - clear handler
	 *
	 * @param [args] - additional arguments for the emitter
	 */
	on<T>(
		emitter: T & EventEmitterLike,
		events: string | string[],
		handler: Function,
		params: AsyncCbOptsSingle & {options?: AddEventListenerOptions},
		...args: any[]
	): Object;

	// tslint:disable-next-line
	on(emitter, events, handler, p, ...args) {
		if (p !== undefined && !Object.isObject(p)) {
			args.unshift(p);
			p = undefined;
		}

		p = p || {};
		events = Object.isArray(events) ? events : events.split(/\s+/);

		if (p.options) {
			p.single = p.options.once = 'single' in p ? p.single : p.options.once;
			args.unshift(p.options);
			p.options = undefined;
		}

		const
			that = this,
			links: any[] = [];

		for (const event of events) {
			links.push(this.setAsync({
				...p,
				name: 'eventListener',
				obj: handler,
				wrapper(): any {
					if (p.single && !emitter.once) {
						const baseHandler = handler;
						handler = function (this: any): any {
							that.eventListenerDestructor({emitter, event, handler, args});
							return baseHandler.apply(this, arguments);
						};
					}

					const
						fn = p.single && emitter.once || emitter.addEventListener || emitter.addListener || emitter.on;

					if (Object.isFunction(fn)) {
						fn.call(emitter, event, handler, ...args);

					} else {
						throw new ReferenceError('Add event listener function for the event emitter is not defined');
					}

					return {
						event,
						emitter,
						handler,
						args
					};
				},

				clearFn: this.eventListenerDestructor,
				linkByWrapper: true,
				interval: !p.single,
				group: p.group || event
			}));
		}

		return events.length === 1 ? links[0] : links;
	}

	/**
	 * Wrapper for an event emitter once
	 *
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param handler - event handler
	 * @param [args] - additional arguments for the emitter
	 */
	once<T>(emitter: T & EventEmitterLike, events: string | string[], handler: Function, ...args: any[]): Object;

	/**
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param handler - event handler
	 * @param params - parameters for the operation:
	 *   *) [options] - additional options for addEventListener
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 *
	 * @param [args] - additional arguments for the emitter
	 */
	once<T>(
		emitter: T & EventEmitterLike,
		events: string | string[],
		handler: Function,
		params: AsyncCbOpts & {options?: AddEventListenerOptions},
		...args: any[]
	): Object;

	// tslint:disable-next-line
	once(emitter, events, handler, p, ...args) {
		if (p !== undefined && !Object.isObject(p)) {
			args.unshift(p);
			p = undefined;
		}

		return this.on(emitter, events, handler, {...p, single: true}, ...args);
	}

	/**
	 * Promise for once
	 *
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param params - parameters for the operation:
	 *   *) [options] - additional options for addEventListener
	 *   *) [join] - strategy for joining competitive tasks (with same labels):
	 *       *) true - all tasks will be joined to the first;
	 *       *) 'replace' - all tasks will be joined (replaced) to the last.
	 *
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *
	 * @param [args] - additional arguments for the emitter
	 */
	promisifyOnce<T>(
		emitter: T & EventEmitterLike,
		events: string | string[],
		params: AsyncOpts & {options?: AddEventListenerOptions},
		...args: any[]
	): Promise<any>;

	/**
	 * @param emitter - event emitter
	 * @param events - event or a list of events (can also specify multiple events with a space)
	 * @param [args] - additional arguments for the emitter
	 */
	promisifyOnce<T>(emitter: T & EventEmitterLike, events: string | string[], ...args: any[]): Promise<any>;

	// tslint:disable-next-line
	promisifyOnce(emitter, events, p, ...args) {
		if (p !== undefined && !Object.isObject(p)) {
			args.unshift(p);
			p = undefined;
		}

		return new Promise((resolve, reject) => {
			this.once(emitter, events, resolve, {
				...p,
				onClear: this.onPromiseClear(resolve, reject)
			}, ...args);
		});
	}

	/**
	 * Wrapper for an event emitter remove listener
	 * @param [id] - operation id (if not defined will be remove all handlers)
	 */
	off(id?: Object): this;

	/**
	 * @param params - parameters for the operation:
	 *   *) [id] - operation id
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	off(params: ClearOptsId<Object>): this;

	// tslint:disable-next-line
	off(p) {
		if (p === undefined) {
			return this.clearAllAsync({name: 'eventListener', clearFn: this.eventListenerDestructor});
		}

		return this.clearAsync({
			...p,
			name: 'eventListener',
			id: p.id || this.getIfEvent(p),
			clearFn: this.eventListenerDestructor
		});
	}

	/**
	 * Adds Drag&Drop listeners to the specified element
	 *
	 * @param el
	 * @param [useCapture]
	 */
	dnd(el: HTMLElement, useCapture?: boolean): string | symbol;

	/**
	 * @param el
	 * @param params - parameters for the operation:
	 *   *) [options] - additional options for addEventListener
	 *   *) [join] - if true, then competitive tasks (with same labels) will be joined to the first
	 *   *) [label] - label for the task (previous task with the same label will be canceled)
	 *   *) [group] - group name for the task
	 *   *) [onClear] - clear handler
	 *   *) [onDragStart]
	 *   *) [onDrag]
	 *   *) [onDragEnd]
	 */
	dnd(el: HTMLElement, params: AsyncCbOpts & {
		options?: AddEventListenerOptions;
		onDragStart?: NodeEventCb | NodeEventOpts;
		onDrag?: NodeEventCb | NodeEventOpts;
		onDragEnd?: NodeEventCb | NodeEventOpts;
	}): string | symbol;

	// tslint:disable-next-line
	dnd(el, p) {
		let
			useCapture;

		if (Object.isObject(p)) {
			useCapture = p.options && p.options.capture;

		} else {
			useCapture = p;
			p = {};
		}

		p.group = p.group || `dnd.${Math.random()}`;
		p.onClear = (<Function[]>[]).concat(p.onClear || []);

		// tslint:disable-next-line
		function dragStartClear(...args) {
			$C(p.onClear).forEach((fn) => fn.call(this, ...args, 'dragstart'));
		}

		// tslint:disable-next-line
		function dragClear(...args) {
			$C(p.onClear).forEach((fn) => fn.call(this, ...args, 'drag'));
		}

		// tslint:disable-next-line
		function dragEndClear(...args) {
			$C(p.onClear).forEach((fn) => fn.call(this, ...args, 'dragend'));
		}

		const dragStartUseCapture = Boolean(
			p.onDragStart && Object.isBoolean((<any>p.onDragStart).capture) ?
				(<NodeEventOpts>p.onDragStart).capture : useCapture
		);

		const dragUseCapture = Boolean(
			p.onDrag && Object.isBoolean((<any>p.onDrag).capture) ?
				(<NodeEventOpts>p.onDrag).capture : useCapture
		);

		const dragEndUseCapture = Boolean(
			p.onDragEnd && Object.isBoolean((<any>p.onDragEnd).capture) ?
				(<NodeEventOpts>p.onDragEnd).capture : useCapture
		);

		const
			that = this,
			opts = {join: p.join, label: p.label, group: p.group};

		function dragStart(e: Event): void {
			e.preventDefault();

			let res;
			if (p.onDragStart) {
				res = (<NodeEventCb>((<NodeEventOpts>p.onDragStart).handler || p.onDragStart)).call(this, e, el);
			}

			const drag = (e) => {
				e.preventDefault();

				if (res !== false && p.onDrag) {
					res = (<NodeEventCb>((<NodeEventOpts>p.onDrag).handler || p.onDrag)).call(this, e, el);
				}
			};

			const
				links: any[] = [];

			$C(['mousemove', 'touchmove']).forEach((e) => {
				links.push(that.on(document, e, drag, {...opts, onClear: dragClear}, dragUseCapture));
			});

			const dragEnd = (e) => {
				e.preventDefault();

				if (res !== false && p.onDragEnd) {
					res = (<NodeEventCb>((<NodeEventOpts>p.onDragEnd).handler || p.onDragEnd)).call(this, e, el);
				}

				$C(links).forEach((id) => that.off({id, group: p.group}));
			};

			$C(['mouseup', 'touchend']).forEach((e) => {
				links.push(that.on(document, e, dragEnd, {...opts, onClear: dragEndClear}, dragEndUseCapture));
			});
		}

		this.on(el, 'mousedown touchstart', dragStart, {...opts, onClear: dragStartClear}, dragStartUseCapture);
		return p.group;
	}

	/**
	 * Clears all async operations
	 *
	 * @param [params] - additional parameters for the operation:
	 *   *) [label] - label for the task
	 *   *) [group] - group name for the task
	 */
	clearAll(params?: ClearOpts): this {
		const
			p: any = params;

		this
			.off(p);

		this
			.clearImmediate(p)
			.clearInterval(p)
			.clearTimeout(p)
			.cancelIdleCallback(p)
			.cancelAnimationFrame(p);

		this
			.cancelRequest(p)
			.terminateWorker(p)
			.cancelProxy(p);

		return this;
	}

	/**
	 * Returns the specified value if it is an event object
	 * @param value
	 */
	protected getIfEvent(value: any & {event?: string}): Function | undefined {
		return Object.isObject(value) && Object.isString(value.event) ? value : undefined;
	}

	/**
	 * Returns the specified value if it is not a plain object
	 * @param value
	 */
	protected getIfNotObject(value: any): Function | undefined {
		return Object.isObject(value) ? undefined : value;
	}

	/**
	 * Returns true if the specified value is promise like
	 * @param value
	 */
	protected isPromiseLike(value: any): value is PromiseLike<any> {
		return Boolean(
			value && (value instanceof Promise || Object.isFunction(value.then) && Object.isFunction(value.catch))
		);
	}

	/**
	 * Removes an event handler from the specified emitter
	 *
	 * @param params - parameters:
	 *   *) emitter - event emitter
	 *   *) event - event name
	 *   *) handler - event handler
	 *   *) args - additional arguments for the emitter
	 */
	protected eventListenerDestructor<T>(params: {
		emitter: T & EventEmitterLike;
		event: string;
		handler: Function;
		args: any[];
	}): void {
		const
			e = params.emitter,
			fn = e.removeEventListener || e.removeListener || e.off;

		if (fn && Object.isFunction(fn)) {
			fn.call(e, params.event, params.handler, ...params.args);

		} else {
			throw new ReferenceError('Remove event listener function for the event emitter is not defined');
		}
	}

	/**
	 * Terminates the specified worker
	 * @param worker
	 */
	protected workerDestructor<T>(worker: T & WorkerLike): void {
		const
			fn = worker.terminate || worker.destroy || worker.close;

		if (fn && Object.isFunction(fn)) {
			fn.call(worker);

		} else {
			throw new ReferenceError('Destructor function for the worker is not defined');
		}
	}

	/**
	 * Cancels the specified request
	 *
	 * @param request
	 * @param ctx - context object
	 */
	protected requestDestructor(request: RequestLike<any>, ctx: AsyncCtx): void {
		const
			fn = request.abort;

		if (fn && Object.isFunction(fn)) {
			fn.call(request, ctx.join === 'replace' ? ctx.replacedBy && ctx.replacedBy.id : undefined);

		} else {
			throw new ReferenceError('Abort function for the request is not defined');
		}
	}

	/**
	 * Factory for promise clear handlers
	 *
	 * @param resolve
	 * @param reject
	 */
	protected onPromiseClear(resolve: Function, reject: Function): Function {
		const MAX_PROMISE_DEPTH = 25;
		return (obj) => {
			const
				{replacedBy} = obj;

			if (replacedBy && obj.join === 'replace' && obj.link.onClear.length < MAX_PROMISE_DEPTH) {
				replacedBy.onComplete.push([resolve, reject]);

				const
					onClear = (<Function[]>[]).concat(obj.link.onClear, reject);

				for (let i = 0; i < onClear.length; i++) {
					replacedBy.onClear.push(onClear[i]);
				}

			} else {
				reject(obj);
			}
		};
	}

	/**
	 * Returns a cache object by the specified name
	 * @param name
	 */
	protected initCache(name: string): CacheObject {
		return this.cache[name] = this.cache[name] || {
			root: {
				labels: Object.create(null),
				links: new Map()
			},

			groups: Object.create(null)
		};
	}

	/**
	 * Initializes the specified listener
	 * @param p
	 */
	protected setAsync(p: any): any {
		const
			baseCache = this.initCache(p.name);

		let cache;
		if (p.group) {
			baseCache.groups[p.group] = baseCache.groups[p.group] || {
				labels: Object.create(null),
				links: new Map()
			};

			cache = baseCache.groups[p.group];

		} else {
			cache = baseCache.root;
		}

		const
			{labels, links} = cache,
			labelCache = labels[p.label];

		if (labelCache && p.join === true) {
			return labelCache;
		}

		const
			that = this,
			ctx = this.context;

		let
			id,
			finalObj,
			wrappedObj = id = finalObj = p.needCall && Object.isFunction(p.obj) ? p.obj.call(ctx || this) : p.obj;

		if (!p.interval || Object.isFunction(wrappedObj)) {
			wrappedObj = function (this: any): any {
				const
					link = links.get(id),
					fnCtx = ctx || this;

				if (!link) {
					return;
				}

				if (!p.interval) {
					links.delete(id);
					labels[p.label] = undefined;
				}

				const execTasks = (i = 0) => (...args) => {
					const
						fns = link.onComplete;

					if (fns) {
						for (let j = 0; j < fns.length; j++) {
							const fn = fns[j];
							(fn[i] || fn).apply(fnCtx, args);
						}
					}
				};

				let res = finalObj;
				if (Object.isFunction(finalObj)) {
					res = finalObj.apply(fnCtx, arguments);
				}

				if (that.isPromiseLike(finalObj)) {
					finalObj.then(execTasks(), execTasks(1));

				} else {
					execTasks().apply(null, arguments);
				}

				return res;
			};
		}

		if (p.wrapper) {
			const
				link = p.wrapper.apply(null, [wrappedObj].concat(p.needCall ? id : [], p.args));

			if (p.linkByWrapper) {
				id = link;
			}
		}

		const link = {
			id,
			obj: p.obj,
			objName: p.obj.name,
			label: p.label,
			onComplete: [],
			onClear: [].concat(p.onClear || [])
		};

		if (labelCache) {
			this.clearAsync({...p, replacedBy: link});
		}

		links.set(id, link);

		if (p.label) {
			labels[p.label] = id;
		}

		return id;
	}

	/**
	 * Clears the specified listeners
	 * @param p
	 */
	protected clearAsync(p: any): this {
		const
			baseCache = this.initCache(p.name);

		let cache;
		if (p.group) {
			if (Object.isRegExp(p.group)) {
				$C(baseCache.groups).forEach((g) => {
					if (p.group.test(g)) {
						this.clearAsync({...p, group: g});
					}
				});

				return this;
			}

			if (!baseCache.groups[p.group]) {
				return this;
			}

			cache = baseCache.groups[p.group];

		} else {
			cache = baseCache.root;
		}

		const
			{labels, links} = cache;

		if (p.label) {
			const
				tmp = labels[p.label];

			if (p.id != null && p.id !== tmp) {
				return this;
			}

			p.id = tmp;
		}

		if (p.id != null) {
			const
				link = links.get(p.id);

			if (link) {
				links.delete(link.id);
				labels[link.label] = undefined;

				const ctx = {
					...p,
					link,
					type: 'clearAsync'
				};

				const
					clearHandlers = link.onClear;

				for (let i = 0; i < clearHandlers.length; i++) {
					clearHandlers[i].call(this.context || this, ctx);
				}

				if (p.clearFn) {
					p.clearFn.call(null, link.id, ctx);
				}
			}

		} else {
			const
				values = links.values();

			for (let el = values.next(); !el.done; el = values.next()) {
				this.clearAsync({...p, id: el.value.id});
			}
		}

		return this;
	}

	/**
	 * Clears all listeners by the specified parameters
	 * @param p
	 */
	protected clearAllAsync(p: any): this {
		this.clearAsync.apply(this, arguments);

		const
			obj = this.initCache(p.name).groups,
			keys = Object.keys(obj);

		for (let i = 0; i < keys.length; i++) {
			this.clearAsync({...p, group: keys[i]});
		}

		return this;
	}
}
