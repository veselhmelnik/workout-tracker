import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

export type AuthenticatedRequest = Request & {
    user: {
        id: string
    }
}

type AccessTokenPayload = {
    sub?: unknown
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>()

        const authorization = request.headers.authorization

        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing access token')
        }

        const token = authorization.slice('Bearer '.length).trim()

        if (!token) {
            throw new UnauthorizedException('Missing access token')
        }

        let payload: AccessTokenPayload

        try {
            payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
                secret: this.config.getOrThrow<string>('JWT_SECRET'),
            })
        } catch {
            throw new UnauthorizedException('Invalid access token')
        }

        if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
            throw new UnauthorizedException('Invalid access token')
        }

        request.user = {
            id: payload.sub,
        }

        return true
    }
}