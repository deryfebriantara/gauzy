// Modified code from https://github.com/alexitaylor/angular-graphql-nestjs-postgres-starter-kit.
// MIT License, see https://github.com/alexitaylor/angular-graphql-nestjs-postgres-starter-kit/blob/master/LICENSE
// Copyright (c) 2019 Alexi Taylor
import yargs from 'yargs';
import * as chalk from 'chalk';

import { SeedDataService } from 'core/seeds/seed-data.service';

/**
 * Usage:
 * yarn db:seed All
 * yarn db:seed Default
 * yarn db:seed Jobs
 * yarn db:seed Reports
 * */

(async () => {
	const seedDataService = new SeedDataService();
	const argv: any = yargs(process.argv).argv;
	const module = argv.name;
	const methodName = `run${module}Seed`;
	if (seedDataService[methodName]) {
		await seedDataService[methodName]();
	} else {
		console.log(
			chalk.red(`Method ${methodName} not found in SeedDataService`)
		);
	}
	process.exit(0);
})();
