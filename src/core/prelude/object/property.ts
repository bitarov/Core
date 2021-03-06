/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import extend from 'core/prelude/extend';

/** @see ObjectConstructor.get */
extend(Object, 'get', (
	obj: any,
	path: string | any[] | ObjectGetOptions,
	opts?: ObjectGetOptions
) => {
	if (needCurriedOverload(obj, path)) {
		const
			curriedPath = obj,
			curriedOpts = <ObjectGetOptions>path;

		return (obj) => Object.get(obj, curriedPath, curriedOpts);
	}

	const
		p = {separator: '.', ...(Object.isPlainObject(path) ? path : opts)};

	const get = (path) => {
		const
			chunks = Object.isString(path) ? path.split(p.separator) : path;

		let
			res = obj;

		for (let i = 0; i < chunks.length; i++) {
			if (res == null) {
				return;
			}

			const
				key = chunks[i];

			// tslint:disable:prefer-conditional-expression
			if (Object.isMap(res) || Object.isWeakMap(res)) {
				res = res.get(key);

			} else {
				res = res[key];
			}
		}

		return res;
	};

	if (Object.isArray(path) || Object.isString(path)) {
		return get(path);
	}

	return get;
});

/** @see ObjectConstructor.has */
extend(Object, 'has', (
	obj: any,
	path?: string | any[] | ObjectGetOptions,
	opts?: ObjectGetOptions
) => {
	if (needCurriedOverload(obj, path)) {
		const
			curriedPath = obj,
			curriedOpts = <ObjectGetOptions>path;

		return (obj) => Object.has(obj, curriedPath, curriedOpts);
	}

	const
		p = {separator: '.', ...(Object.isPlainObject(path) ? path : opts)};

	const has = (path) => {
		const
			chunks = Object.isString(path) ? path.split(p.separator) : path;

		let
			res = obj,
			i = 0;

		for (; i < chunks.length - 1; i++) {
			if (res == null) {
				return false;
			}

			const
				key = chunks[i];

			// tslint:disable:prefer-conditional-expression
			if (Object.isMap(res) || Object.isWeakMap(res)) {
				res = res.get(key);

			} else {
				res = res[key];
			}
		}

		const
			key = chunks[i];

		if (res == null) {
			return false;
		}

		if (Object.isMap(res) || Object.isWeakMap(res)) {
			return res.has(key);
		}

		return typeof res === 'object' ? key in res : res[key] !== undefined;
	};

	if (Object.isArray(path) || Object.isString(path)) {
		return has(path);
	}

	return has;
});

const
	{hasOwnProperty} = Object.prototype;

/** @see ObjectConstructor.hasOwnProperty */
// tslint:disable-next-line:only-arrow-functions
extend(Object, 'hasOwnProperty', function (obj: any, key?: string): boolean | AnyFunction {
	if (arguments.length > 1) {
		if (obj == null) {
			return false;
		}

		return hasOwnProperty.call(obj, key);
	}

	if (Object.isString(obj)) {
		key = obj;
		return (obj) => Object.hasOwnProperty(obj, key!);
	}

	return (key) => Object.hasOwnProperty(obj, key);
});

/** @see ObjectConstructor.set */
// tslint:disable-next-line:only-arrow-functions
extend(Object, 'set', function (
	obj: any,
	path: string | any[] | ObjectGetOptions,
	value: unknown,
	opts?: ObjectSetOptions
): unknown | AnyFunction {
	if (needCurriedOverload(obj, path)) {
		const
			curriedPath = obj,
			curriedOpts = <ObjectGetOptions>path;

		// tslint:disable-next-line:only-arrow-functions
		return function (obj: any, newValue: unknown): unknown {
			Object.set(obj, curriedPath, arguments.length > 1 ? newValue : value, curriedOpts);
			return obj;
		};
	}

	const
		p = {separator: '.', concat: false, ...(Object.isPlainObject(path) ? path : opts)};

	// tslint:disable-next-line:only-arrow-functions
	const set = function (path: string | any[], newValue?: unknown): unknown {
		const
			finalValue = arguments.length > 1 ? newValue : value,
			chunks = Object.isString(path) ? path.split(p.separator) : path;

		let
			ref = obj,
			cursor: any;

		for (let i = 0; i < chunks.length; i++) {
			const
				key = chunks[i];

			if (chunks.length === i + 1) {
				cursor = key;
				continue;
			}

			const
				nextChunkIsObj = isNaN(Number(chunks[i + 1]));

			// tslint:disable:prefer-conditional-expression
			if (Object.isMap(ref) || Object.isWeakMap(ref)) {
				let
					val = ref.get(key);

				if (!val || typeof val !== 'object') {
					ref.set(key, (val = nextChunkIsObj ? new Map() : []));
				}

				ref = val;

			} else {
				let
					val = <any>ref[key];

				if (!val || typeof val !== 'object') {
					ref[key] = (val = nextChunkIsObj ? {} : []);
				}

				ref = val;
			}
		}

		// tslint:disable:prefer-conditional-expression
		if (Object.isMap(ref) || Object.isWeakMap(ref)) {
			if (ref.has(cursor) && p.concat) {
				ref.set(cursor, Array.concat([], ref[cursor], finalValue));

			} else {
				ref.set(cursor, finalValue);
			}

		} else {
			ref[cursor] = cursor in ref && p.concat ?
				Array.concat([], ref[cursor], finalValue) : finalValue;
		}

		return finalValue;
	};

	if (Object.isArray(path) || Object.isString(path)) {
		if (arguments.length > 2) {
			return (value) => {
				set(path, value);
				return obj;
			};
		}

		return set(path, value);
	}

	return (path, ...args) => {
		set(path, ...args);
		return obj;
	};
});

function needCurriedOverload(obj: unknown, path: unknown): boolean {
	return (Object.isString(obj) || Object.isArray(obj)) && (path == null || Object.isDictionary(path));
}
