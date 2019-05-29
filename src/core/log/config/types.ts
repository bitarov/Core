/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import { LogLevel } from 'core/log';

export interface LogConfig {
	pipelines?: LogPipelineConfig[];
}

export interface LogPipelineConfig {
	engine: string;
	middlewares?: string;
	minimumLevel?: LogLevel;
	styles?: LogStylesConfig;
}

export type LogStylesConfig = {[key in LogLevel | 'default']?: Dictionary};

export interface StylesCache extends LogStylesConfig {
	getStyle(logLevel: LogLevel): CanUndef<Dictionary>;
}
