/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import { toProxyObject, toOriginalObject, watchOptions, watchHandlers } from 'core/object/watch/const';
import { bindMutationHooks } from 'core/object/watch/wrap';
import { unwrap, proxyType, getProxyValue } from 'core/object/watch/engines/helpers';
import { WatchPath, WatchHandler, WatchOptions, Watcher } from 'core/object/watch/interface';

/**
 * Watches for changes of the specified object by using Proxy objects
 *
 * @param obj
 * @param path - base path to object properties: it is provided to a watch handler with parameters
 * @param cb - callback that is invoked on every mutation hook
 * @param [opts] - additional options
 */
export function watch<T>(
	obj: T,
	path: CanUndef<unknown[]>,
	cb: WatchHandler,
	opts?: WatchOptions
): Watcher<T>;

/**
 * Watches for changes of the specified object by using Proxy objects
 *
 * @param obj
 * @param path - base path to object properties: it is provided to a watch handler with parameters
 * @param cb - callback that is invoked on every mutation hook
 * @param [opts] - additional options
 * @param [top] - link a top property of watching
 * @param [handlers] - map of registered handlers
 */
export function watch<T>(
	obj: T,
	path: CanUndef<unknown[]>,
	cb: Nullable<WatchHandler>,
	opts: CanUndef<WatchOptions>,
	top: object,
	handlers: Map<WatchHandler, boolean>
): T;

export function watch<T>(
	obj: T,
	path: CanUndef<unknown[]>,
	cb: Nullable<WatchHandler>,
	opts?: WatchOptions,
	top?: object,
	handlers?: Map<WatchHandler, boolean>
): Watcher<T> | T {
	const
		unwrappedObj = unwrap(obj);

	if (unwrappedObj) {
		handlers = handlers || unwrappedObj[watchHandlers] || new Map();
	}

	const returnProxy = (obj, proxy?) => {
		if (proxy && cb && handlers && (!top || !handlers.has(cb))) {
			handlers.set(cb, true);
		}

		if (top) {
			return proxy || obj;
		}

		return {
			proxy: proxy || obj,
			unwatch(): void {
				if (cb && handlers) {
					handlers.set(cb, false);
				}
			}
		};
	};

	if (!unwrappedObj) {
		return returnProxy(obj);
	}

	if (!top) {
		handlers = unwrappedObj[watchHandlers] = handlers;

		const
			tmpOpts = unwrappedObj[watchOptions] = unwrappedObj[watchOptions] || {...opts};

		if (opts?.deep) {
			tmpOpts.deep = true;
		}

		opts = tmpOpts;
	}

	let
		proxy = unwrappedObj[toProxyObject];

	if (proxy) {
		return returnProxy(unwrappedObj, proxy);
	}

	if (!proxyType(unwrappedObj)) {
		return returnProxy(unwrappedObj);
	}

	const
		isRoot = path === undefined;

	if (!Object.isDictionary(unwrappedObj) && !Object.isArray(unwrappedObj)) {
		bindMutationHooks(unwrappedObj, {top, path, isRoot}, handlers!);
	}

	proxy = new Proxy(unwrappedObj, {
		get: (target, key, receiver) => {
			if (key === toOriginalObject) {
				return target;
			}

			const
				isArray = Object.isArray(target),
				isCustomObj = isArray || Object.isCustomObject(target),
				val = Reflect.get(target, key, isCustomObj ? receiver : target);

			if (Object.isSymbol(key)) {
				return val;
			}

			if (isCustomObj) {
				if (isArray && String(Number(key)) === key) {
					key = Number(key);
				}

				return getProxyValue(val, key, path, handlers!, top, opts);
			}

			return Object.isFunction(val) ? val.bind(target) : val;
		},

		set: (target, key, val, receiver) => {
			if (key === toOriginalObject) {
				return false;
			}

			const
				isCustomObj = Object.isCustomObject(target),
				set = () => Reflect.set(target, key, val, isCustomObj ? receiver : target);

			if (Object.isSymbol(key)) {
				return set();
			}

			if (Object.isArray(target) && String(Number(key)) === key) {
				key = Number(key);
			}

			const
				oldVal = Reflect.get(target, key, isCustomObj ? receiver : target);

			if (oldVal !== val && set()) {
				for (let o = handlers!.entries(), el = o.next(); !el.done; el = o.next()) {
					const
						[handler, state] = el.value;

					if (state) {
						handler(val, oldVal, {
							obj: unwrappedObj,
							top,
							isRoot,
							path: (<unknown[]>[]).concat(path ?? [], key)
						});
					}
				}
			}

			return true;
		}
	});

	unwrappedObj[toProxyObject] = proxy;
	return returnProxy(unwrappedObj, proxy);
}

/**
 * Sets a new watchable value for an object by the specified path
 *
 * @param obj
 * @param path
 * @param value
 */
export function set(obj: object, path: WatchPath, value: unknown): void {
	const
		unwrappedObj = unwrap(obj);

	if (!unwrappedObj) {
		return;
	}

	const
		normalizedPath = Object.isArray(path) ? path : path.split('.');

	const
		prop = normalizedPath[normalizedPath.length - 1],
		refPath = normalizedPath.slice(0, -1);

	const
		ref = Object.get(unwrappedObj[toProxyObject] || unwrappedObj, refPath);

	if (!Object.isDictionary(ref)) {
		const
			type = proxyType(ref);

		switch (type) {
			case 'array':
				(<unknown[]>ref).splice(Number(prop), 1, value);
				break;

			case 'map':
				(<Map<unknown, unknown>>ref).set(prop, value);
		}

		return;
	}

	ref[String(prop)] = value;
}

/**
 * Unsets a watchable value for an object by the specified path
 *
 * @param obj
 * @param path
 */
export function unset(obj: object, path: WatchPath): void {
	const
		unwrappedObj = unwrap(obj);

	if (!unwrappedObj) {
		return;
	}

	const
		normalizedPath = Object.isArray(path) ? path : path.split('.');

	const
		prop = normalizedPath[normalizedPath.length - 1],
		refPath = normalizedPath.slice(0, -1);

	const
		ref = Object.get(unwrappedObj[toProxyObject] || unwrappedObj, refPath);

	if (!Object.isDictionary(ref)) {
		const
			type = proxyType(ref);

		switch (type) {
			case 'array':
				(<unknown[]>ref).splice(Number(prop), 1);
				break;

			case 'map':
			case 'set':
				(<Map<unknown, unknown>>ref).delete(prop);
		}

		return;
	}

	ref[String(prop)] = undefined;
}
