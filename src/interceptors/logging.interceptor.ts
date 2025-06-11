import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
    }>();
    const method: string = req.method;
    const url: string = req.url;
    const now = Date.now();

    this.logger.log(`${method} ${url} - Request started`);

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<{
          statusCode: number;
        }>();
        const statusCode: number = res.statusCode;
        const responseTime = Date.now() - now;
        this.logger.log(`${method} ${url} ${statusCode} - ${responseTime}ms`);
      }),
    );
  }
}
