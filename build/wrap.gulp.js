'use strict';

/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

const
	$C = require('collection.js');

let gulpInitialized;

/**
 * Wraps all base gulp methods for inheritance
 * @param gulp
 */
exports.wrapGulp = function (gulp) {
	const
		addTask = gulp.task.bind(gulp),
		series = gulp.series.bind(gulp),
		parallel = gulp.parallel.bind(gulp),
		cache = new Map();

	gulp.task = (name, tasks) => {
		if (gulpInitialized) {
			return addTask(name, tasks);
		}

		cache.set(name.name || name, tasks || name);
	};

	function apply(tasks) {
		if (Object.isArray(tasks)) {
			return $C(tasks).map((tasks) => apply(tasks));
		}

		if (Object.isObject(tasks)) {
			return tasks.init();
		}

		return tasks;
	}

	gulp.series = (tasks) => {
		if (gulpInitialized) {
			return series(tasks);
		}

		return {
			type: 'series',
			init: () => series(apply(tasks))
		};
	};

	gulp.parallel = (tasks) => {
		if (gulpInitialized) {
			return parallel(tasks);
		}

		return {
			type: 'parallel',
			init: () => parallel(apply(tasks))
		};
	};

	gulp.init = () => {
		if (gulpInitialized) {
			return;
		}

		gulpInitialized = true;
		$C(cache).forEach((tasks, name) => {
			addTask(name, Object.isFunction(tasks) ? tasks : tasks.init());
		});
	};
};
