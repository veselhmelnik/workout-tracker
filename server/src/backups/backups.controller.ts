import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common'
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token-guard'
import { BackupsService } from './backups.service'
import { CreateBackupDto } from './create-backup.dto'

@Controller('backups')
@UseGuards(AccessTokenGuard)
export class BackupsController {
    constructor(private readonly backups: BackupsService) { }

    @Post()
    create(
        @Req() request: AuthenticatedRequest,
        @Body() dto: CreateBackupDto,
    ) {
        return this.backups.create(
            request.user.id,
            dto.payload,
            dto.sha256,
        )
    }

    @Get('latest')
    async latest(@Req() request: AuthenticatedRequest) {
        return {
            backup: await this.backups.getLatest(request.user.id),
        }
    }
}