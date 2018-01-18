/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

/// <reference types="collection.js"/>
/// <reference types="sugar/sugar-extended"/>

declare function Any(obj: any): any;
declare function stderr(err: any): void;
declare function infinity<T>(): Iterable<T>;

declare function i18n(strings: any | string[], ...expr: any[]): string;
declare function t(strings: any | string[], ...expr: any[]): string;
declare function l(strings: any | string[], ...expr: any[]): string;

declare class IdleDeadline {
	readonly didTimeout: boolean;
	timeRemaining(): number;
}

declare function requestIdleCallback(fn: (deadline: IdleDeadline) => void, opts?: {timer?: number}): number;
declare function cancelIdleCallback(id: number): void;

interface Dictionary<T = any> {
	[key: string]: T;
}

interface JSONCb {
	(key: string, value: any): any;
}

interface ObjectConstructor {
	mixin<T>(
		params: CollectionJS.ExtendParams<T> & CollectionJS.Async,
		target?: T,
		...source: any[]
	): CollectionJS.ThreadObj<T & CollectionJS.AnyRecord>;

	mixin<T>(
		deepOrParams: boolean | CollectionJS.ExtendParams<T>,
		target?: T,
		...source: any[]
	): T & CollectionJS.AnyRecord;

	fastClone<T extends Object>(
		obj: T,
		params?: {replacer?: JSONCb; reviver?: JSONCb} | false
	): T;

	fastCompare<T>(a: any, b: T): a is T;
	parse(value: any): any;
	createMap<T extends Object>(obj: T): T & Dictionary;
	createDict<T>(fields: T): {[P in keyof T]: T[P]};
	createDict<T = any>(): Dictionary<T>;
	createDict(...fields: any[]): Dictionary;
	fromArray(arr: any[]): Dictionary<boolean>;
	isTable(obj: any): obj is Dictionary;
}

interface Object {
	toSource(): string;
}

interface DateConstructor {
	getWeekDays(): string[];
}
