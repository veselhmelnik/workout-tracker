import {
    IsString,
    Length,
    MaxLength,
    MinLength,
} from 'class-validator'

export class CreateBackupDto {
    @IsString()
    @MinLength(2)
    // Safety against absurd request bodies at the validation layer.
    // The actual UTF-8 byte limit is checked separately in the service.
    @MaxLength(21_000_000)
    payload!: string

    @IsString()
    @Length(64, 64)
    sha256!: string
}