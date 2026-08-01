import { IncomingMessage, ServerResponse } from 'http';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: isProduction ? 'info' : 'debug',
        serializers: {
          req: (req: IncomingMessage) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: ServerResponse) => ({
            statusCode: res.statusCode,
          }),
        },
        // pino-pretty solo en desarrollo; en producción se usa JSON estándar.
        ...(isProduction
          ? {}
          : {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  levelFirst: true,
                  translateTime: 'SYS:dd/mm/yyyy, HH:MM:ss',
                  ignore: 'pid,hostname,context',
                  messageFormat: '{if context}{context} - {end}{msg}',
                },
              },
            }),
      },
    }),
  ],
})
export class LoggerModule {}
