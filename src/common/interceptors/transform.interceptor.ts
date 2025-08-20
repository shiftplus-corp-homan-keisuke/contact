import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto, MetaDto } from '../dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, BaseResponseDto<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<BaseResponseDto<T>> {
        const request = context.switchToHttp().getRequest();
        const requestId = request.headers['x-request-id'] || this.generateRequestId();

        return next.handle().pipe(
            map(data => {
                // 既にBaseResponseDto形式の場合はそのまま返す
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }

                // メタデータを作成
                const meta = new MetaDto(requestId);

                // BaseResponseDto形式に変換
                return BaseResponseDto.success(data, meta);
            }),
        );
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}