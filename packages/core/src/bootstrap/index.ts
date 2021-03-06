// import * as csurf from 'csurf';
import { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SentryService } from '@ntegral/nestjs-sentry';
import * as expressSession from 'express-session';
import * as helmet from 'helmet';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IPluginConfig } from '@gauzy/common';
import { getConfig, setConfig, environment as env } from '@gauzy/config';
import { getEntitiesFromPlugins } from '@gauzy/plugin';
import { coreEntities } from '../core/entities';
import { AppService } from '../app.service';
import { AppModule } from '../app.module';
// import { Logger } from '../logger/logger';

export async function bootstrap(
	pluginConfig?: Partial<IPluginConfig>
): Promise<INestApplication> {
	const config = await registerPluginConfig(pluginConfig);

	// Logger.setLogger(config.logger);
	// Logger.info(`Bootstrapping Server (pid: ${process.pid})...`);

	const bootstrapModule = await import('./bootstrap.module');
	const [classname] = Object.keys(bootstrapModule);

	const app = await NestFactory.create<NestExpressApplication>(
		bootstrapModule[classname],
		{
			logger: ['error', 'warn']
		}
	);

	app.useLogger(app.get(SentryService));
	app.enableCors();

	// TODO: enable csurf
	// As explained on the csurf middleware page https://github.com/expressjs/csurf#csurf,
	// the csurf module requires either a session middleware or cookie-parser to be initialized first.
	// app.use(csurf());

	app.use(
		expressSession({
			secret: env.EXPRESS_SESSION_SECRET,
			resave: true,
			saveUninitialized: true
		})
	);

	app.use(helmet());
	const globalPrefix = 'api';
	app.setGlobalPrefix(globalPrefix);

	const service = app.select(AppModule).get(AppService);
	await service.seedDBIfEmpty();

	// const options = new DocumentBuilder()
	// 	.setTitle('Gauzy API')
	// 	.setVersion('1.0')
	// 	.addBearerAuth()
	// 	.build();

	// const document = SwaggerModule.createDocument(app, options);
	// SwaggerModule.setup('swg', app, document);

	const { hostname, port } = config.apiConfigOptions;
	await app.listen(port || 3000, hostname, () => {
		console.log(`Listening at http://${hostname}:${port}/${globalPrefix}`);
	});
	return app;
}

/**
 * Setting the global config must be done prior to loading the Bootstrap Module.
 */
export async function registerPluginConfig(
	pluginConfig: Partial<IPluginConfig>
) {
	if (Object.keys(pluginConfig).length > 0) {
		setConfig(pluginConfig);
	}

	const entities = await registerAllEntities(pluginConfig);
	setConfig({
		dbConnectionOptions: {
			entities
		}
	});

	let registeredConfig = getConfig();
	return registeredConfig;
}

/**
 * Returns an array of core entities and any additional entities defined in plugins.
 */
export async function registerAllEntities(
	pluginConfig: Partial<IPluginConfig>
) {
	const allEntities = coreEntities as Array<Type<any>>;
	const pluginEntities = getEntitiesFromPlugins(pluginConfig.plugins);

	for (const pluginEntity of pluginEntities) {
		allEntities.push(pluginEntity);
	}
	return allEntities;
}
